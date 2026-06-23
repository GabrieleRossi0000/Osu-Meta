import {
  displayTagFromRankedSet,
  extractGenreLanguageTagsFromTagString
} from '../shared/genre-language-tags'
import {
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
import { downloadBeatmapOsuText } from './osu-beatmap-download'
import {
  fetchBeatmapsetFromApi,
  fetchFirstBeatmapIdFromSet,
  isOsuApiConfigured,
  searchRankedBeatmapsetsByMetadata
} from './osu-api-client'
import { readGenreFromContent, readLanguageFromContent, readMetadataFromContent } from './osu-file'
import {
  fetchBeatmapsetFromWebPage,
  toSourceMatchCandidate,
  webBeatmapsetGenreLanguage
} from './osu-beatmapset-web'

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

async function loadCandidateFromSetId(
  beatmapSetId: number
): Promise<(SourceMatchCandidate & { tags?: string }) | null> {
  const fromWeb = await fetchBeatmapsetFromWebPage(beatmapSetId)
  if (fromWeb) return toSourceMatchCandidate(fromWeb)

  if (isOsuApiConfigured()) {
    return fetchBeatmapsetFromApi(beatmapSetId)
  }

  return null
}

async function loadRankedSetTagContext(
  beatmapSetId: number
): Promise<{ tags: string; genre: string; language: string }> {
  const fromApi = await fetchBeatmapsetFromApi(beatmapSetId)
  let tags = fromApi?.tags?.trim() ?? ''
  let genre = fromApi?.genre?.trim() ?? ''
  let language = fromApi?.language?.trim() ?? ''

  if (!tags || !genre || !language) {
    const fromWeb = await fetchBeatmapsetFromWebPage(beatmapSetId)
    if (fromWeb) {
      if (!tags) tags = fromWeb.tags?.trim() ?? ''
      const webGenreLanguage = webBeatmapsetGenreLanguage(fromWeb)
      if (!genre) genre = webGenreLanguage.genre
      if (!language) language = webGenreLanguage.language
    }
  }

  if (!tags || !genre || !language) {
    const beatmapId = await fetchFirstBeatmapIdFromSet(beatmapSetId)
    if (beatmapId != null) {
      const osuText = await downloadBeatmapOsuText(beatmapId)
      if (osuText) {
        if (!tags) tags = readMetadataFromContent(osuText).tags
        if (!genre) genre = readGenreFromContent(osuText)
        if (!language) language = readLanguageFromContent(osuText)
      }
    }
  }

  return { tags, genre, language }
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

export async function suggestRankedGenreLanguage(
  request: SuggestRankedGenreLanguageRequest
): Promise<RankedGenreLanguageResult> {
  const query: SourceMatchQuery = {
    artistUnicode: request.artistUnicode,
    artist: request.artist,
    titleUnicode: request.titleUnicode,
    title: request.title
  }

  const artist = artistForSearch(query)
  const title = titleForSearch(query)
  if (!artist || !title) {
    return { kind: 'unavailable', message: 'Artist and title are required.' }
  }

  const candidates: SourceMatchCandidate[] = []

  if (request.beatmapSetId != null && request.beatmapSetId > 0) {
    const direct = await loadCandidateFromSetId(request.beatmapSetId)
    if (direct) candidates.push(direct)
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

  await searchAndCollect(title)

  let uniqueCandidates = dedupeCandidates(candidates)
  let best = pickLatestRankedMatch(query, uniqueCandidates)

  if (!best && titleHasVersionMarkers(title)) {
    const strippedTitle = stripTitleVersionMarkers(title)
    if (strippedTitle) {
      await searchAndCollect(strippedTitle)
      uniqueCandidates = dedupeCandidates(candidates)
      best = pickLatestRankedMatch(query, uniqueCandidates)
    }
  }

  if (!best) {
    if (!isOsuApiConfigured() && uniqueCandidates.length === 0) {
      return {
        kind: 'unavailable',
        message: 'Could not look up ranked sets on osu!.'
      }
    }
    return { kind: 'not_found' }
  }

  const { tags: rankedTags, genre: pageGenre, language: pageLanguage } =
    await loadRankedSetTagContext(best.beatmapSetId)
  return {
    kind: 'found',
    suggestion: toSuggestion(best, rankedTags, pageGenre, pageLanguage)
  }
}
