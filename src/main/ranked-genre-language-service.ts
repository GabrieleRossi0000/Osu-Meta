import {
  displayTagFromRankedSet,
  extractGenreLanguageTagsFromTagString
} from '../shared/genre-language-tags'
import {
  buildSourceSuggestionCacheKey,
  isRankedStatus,
  metadataMatchesCandidate,
  stripTitleVersionMarkers,
  titleHasVersionMarkers,
  type SourceMatchCandidate,
  type SourceMatchQuery
} from '../shared/source-match'
import type {
  RankedGenreLanguageResult,
  RankedGenreLanguageSuggestion,
  SuggestRankedGenreLanguageRequest
} from '../shared/types'
import {
  fetchBeatmapsetFromApi,
  isOsuApiConfigured,
  searchRankedBeatmapsetsByMetadata
} from './osu-api-client'
import {
  fetchBeatmapsetFromWebPage,
  toSourceMatchCandidate,
  webBeatmapsetGenreLanguage
} from './osu-beatmapset-web'
import {
  getGenreLanguageSuggestionCached,
  setGenreLanguageSuggestionCached
} from './settings'

const TAG_CONTEXT_CACHE_TTL_MS = 15 * 60 * 1000

interface TagContext {
  tags: string
  genre: string
  language: string
}

interface CacheEntry<T> {
  expiresAt: number
  value: T
}

const tagContextCache = new Map<number, CacheEntry<TagContext>>()

function artistForSearch(query: SourceMatchQuery): string {
  return query.artistUnicode.trim() || query.artist.trim()
}

function titleForSearch(query: SourceMatchQuery): string {
  return query.titleUnicode.trim() || query.title.trim()
}

function rankedDateMs(candidate: SourceMatchCandidate): number {
  if (!candidate.rankedDate) return 0
  const ms = Date.parse(candidate.rankedDate)
  return Number.isFinite(ms) ? ms : 0
}

function dedupeCandidates(candidates: SourceMatchCandidate[]): SourceMatchCandidate[] {
  const seen = new Map<number, SourceMatchCandidate>()
  for (const candidate of candidates) {
    const existing = seen.get(candidate.beatmapSetId)
    if (!existing || rankedDateMs(candidate) > rankedDateMs(existing)) {
      seen.set(candidate.beatmapSetId, candidate)
    }
  }
  return [...seen.values()]
}

function pickLatestRankedMatch(
  query: SourceMatchQuery,
  candidates: SourceMatchCandidate[]
): SourceMatchCandidate | null {
  const matches = candidates.filter(
    (candidate) => metadataMatchesCandidate(query, candidate) && isRankedStatus(candidate.status)
  )
  if (matches.length === 0) return null

  return [...matches].sort((a, b) => rankedDateMs(b) - rankedDateMs(a))[0] ?? null
}

function buildGenreLanguageCacheKey(request: SuggestRankedGenreLanguageRequest): string {
  const base = buildSourceSuggestionCacheKey({
    artistUnicode: request.artistUnicode,
    artist: request.artist,
    titleUnicode: request.titleUnicode,
    title: request.title
  })
  return `${base}::${request.beatmapSetId ?? 0}`
}

async function loadCandidateFromSetId(
  beatmapSetId: number
): Promise<SourceMatchCandidate | null> {
  if (isOsuApiConfigured()) {
    const fromApi = await fetchBeatmapsetFromApi(beatmapSetId)
    if (fromApi) return fromApi
  }

  const fromWeb = await fetchBeatmapsetFromWebPage(beatmapSetId)
  if (fromWeb) return toSourceMatchCandidate(fromWeb)

  return null
}

function readTagContextCache(beatmapSetId: number): TagContext | undefined {
  const entry = tagContextCache.get(beatmapSetId)
  if (!entry) return undefined
  if (entry.expiresAt <= Date.now()) {
    tagContextCache.delete(beatmapSetId)
    return undefined
  }
  return entry.value
}

function writeTagContextCache(beatmapSetId: number, value: TagContext): void {
  tagContextCache.set(beatmapSetId, {
    expiresAt: Date.now() + TAG_CONTEXT_CACHE_TTL_MS,
    value
  })
}

async function loadRankedSetTagContext(beatmapSetId: number): Promise<TagContext> {
  const cached = readTagContextCache(beatmapSetId)
  if (cached) return cached

  const [fromApi, fromWeb] = await Promise.all([
    isOsuApiConfigured() ? fetchBeatmapsetFromApi(beatmapSetId) : Promise.resolve(null),
    fetchBeatmapsetFromWebPage(beatmapSetId)
  ])

  let tags = fromApi?.tags?.trim() ?? ''
  let genre = fromApi?.genre?.trim() ?? ''
  let language = fromApi?.language?.trim() ?? ''

  if (fromWeb) {
    if (!tags) tags = fromWeb.tags?.trim() ?? ''
    const webGenreLanguage = webBeatmapsetGenreLanguage(fromWeb)
    if (!genre) genre = webGenreLanguage.genre
    if (!language) language = webGenreLanguage.language
  }

  const result = { tags, genre, language }
  writeTagContextCache(beatmapSetId, result)
  return result
}

function toSuggestion(
  candidate: SourceMatchCandidate,
  rankedTags: string,
  pageGenre: string,
  pageLanguage: string
): RankedGenreLanguageSuggestion {
  const extracted = extractGenreLanguageTagsFromTagString(rankedTags)
  return {
    beatmapSetId: candidate.beatmapSetId,
    artist: candidate.artistUnicode?.trim() || candidate.artist,
    title: candidate.titleUnicode?.trim() || candidate.title,
    creator: candidate.creator,
    rankedDate: candidate.rankedDate ?? null,
    rankedTags,
    pageGenre,
    pageLanguage,
    genreTags: extracted.genreTags.map((tag) => displayTagFromRankedSet(rankedTags, tag)),
    languageTags: extracted.languageTags.map((tag) => displayTagFromRankedSet(rankedTags, tag))
  }
}

function cacheableResult(result: RankedGenreLanguageResult): boolean {
  return result.kind === 'found' || result.kind === 'not_found' || result.kind === 'unavailable'
}

export async function suggestRankedGenreLanguage(
  request: SuggestRankedGenreLanguageRequest
): Promise<RankedGenreLanguageResult> {
  const cacheKey = buildGenreLanguageCacheKey(request)
  const cached = getGenreLanguageSuggestionCached(cacheKey)
  if (cached) {
    const mayRetryWithoutMarkers =
      cached.kind === 'not_found' &&
      titleHasVersionMarkers(titleForSearch({
        artistUnicode: request.artistUnicode,
        artist: request.artist,
        titleUnicode: request.titleUnicode,
        title: request.title
      }))
    if (!mayRetryWithoutMarkers) return cached
  }

  const query: SourceMatchQuery = {
    artistUnicode: request.artistUnicode,
    artist: request.artist,
    titleUnicode: request.titleUnicode,
    title: request.title
  }

  const artist = artistForSearch(query)
  const title = titleForSearch(query)
  if (!artist || !title) {
    const result: RankedGenreLanguageResult = {
      kind: 'unavailable',
      message: 'Artist and title are required.'
    }
    setGenreLanguageSuggestionCached(cacheKey, result)
    return result
  }

  const candidates: SourceMatchCandidate[] = []
  let best: SourceMatchCandidate | null = null

  if (request.beatmapSetId != null && request.beatmapSetId > 0) {
    const direct = await loadCandidateFromSetId(request.beatmapSetId)
    if (direct) {
      candidates.push(direct)
      if (metadataMatchesCandidate(query, direct) && isRankedStatus(direct.status)) {
        best = direct
      }
    }
  }

  async function searchAndCollect(searchTitle: string): Promise<void> {
    if (!isOsuApiConfigured()) return
    try {
      const searchResults = await searchRankedBeatmapsetsByMetadata(artist, searchTitle)
      candidates.push(...searchResults)
    } catch {
      // fall through
    }
  }

  if (!best) {
    await searchAndCollect(title)

    let uniqueCandidates = dedupeCandidates(candidates)
    best = pickLatestRankedMatch(query, uniqueCandidates)

    if (!best && titleHasVersionMarkers(title)) {
      const strippedTitle = stripTitleVersionMarkers(title)
      if (strippedTitle) {
        await searchAndCollect(strippedTitle)
        uniqueCandidates = dedupeCandidates(candidates)
        best = pickLatestRankedMatch(query, uniqueCandidates)
      }
    }
  }

  let result: RankedGenreLanguageResult

  if (!best) {
    if (!isOsuApiConfigured() && candidates.length === 0) {
      result = {
        kind: 'unavailable',
        message: 'Could not look up ranked sets on osu!.'
      }
    } else {
      result = { kind: 'not_found' }
    }
  } else {
    const { tags: rankedTags, genre: pageGenre, language: pageLanguage } =
      await loadRankedSetTagContext(best.beatmapSetId)
    result = {
      kind: 'found',
      suggestion: toSuggestion(best, rankedTags, pageGenre, pageLanguage)
    }
  }

  if (cacheableResult(result)) {
    setGenreLanguageSuggestionCached(cacheKey, result)
  }

  return result
}
