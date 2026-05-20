import {
  buildSourceSuggestionCacheKey,
  isRankedStatus,
  metadataMatchesCandidate,
  pickBestRankedSource,
  stripTitleVersionMarkers,
  titleHasVersionMarkers,
  type SourceMatchCandidate,
  type SourceMatchQuery
} from '../shared/source-match'
import type { RankedSourceSuggestion, RankedSourceSuggestionResult } from '../shared/types'
import {
  fetchBeatmapsetFromApi,
  isOsuApiConfigured,
  searchRankedBeatmapsetsByMetadata
} from './osu-api-client'
import {
  fetchBeatmapsetFromWebPage,
  toSourceMatchCandidate
} from './osu-beatmapset-web'
import { getSourceSuggestionCached, setSourceSuggestionCached } from './settings'

function toSuggestion(candidate: SourceMatchCandidate): RankedSourceSuggestion {
  return {
    source: candidate.source.trim(),
    beatmapSetId: candidate.beatmapSetId,
    artist: candidate.artistUnicode?.trim() || candidate.artist,
    title: candidate.titleUnicode?.trim() || candidate.title,
    creator: candidate.creator,
    status: candidate.status
  }
}

function found(candidate: SourceMatchCandidate): RankedSourceSuggestionResult {
  return { kind: 'found', suggestion: toSuggestion(candidate) }
}

async function loadCandidateFromSetId(
  beatmapSetId: number
): Promise<SourceMatchCandidate | null> {
  const fromWeb = await fetchBeatmapsetFromWebPage(beatmapSetId)
  if (fromWeb) return toSourceMatchCandidate(fromWeb)

  if (isOsuApiConfigured()) {
    return fetchBeatmapsetFromApi(beatmapSetId)
  }

  return null
}

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

export async function suggestRankedSource(
  query: SourceMatchQuery,
  beatmapSetId: number | null,
  options?: { refresh?: boolean }
): Promise<RankedSourceSuggestionResult> {
  const artist = artistForSearch(query)
  const title = titleForSearch(query)
  if (!artist || !title) {
    return { kind: 'unavailable', message: 'Artist and title are required.' }
  }

  const cacheKey = buildSourceSuggestionCacheKey(query)
  if (!options?.refresh) {
    const cached = getSourceSuggestionCached(cacheKey)
    if (cached) {
      const mayRetryWithoutMarkers =
        (cached.kind === 'not_found' || cached.kind === 'no_source') && titleHasVersionMarkers(title)
      if (!mayRetryWithoutMarkers) return cached
    }
  }

  const candidates: SourceMatchCandidate[] = []

  if (beatmapSetId != null && beatmapSetId > 0) {
    const direct = await loadCandidateFromSetId(beatmapSetId)
    if (direct) candidates.push(direct)
  }

  async function searchAndCollect(searchTitle: string): Promise<void> {
    if (!isOsuApiConfigured()) return
    try {
      const searchResults = await searchRankedBeatmapsetsByMetadata(artist, searchTitle)
      candidates.push(...searchResults)
    } catch {
      // fall through to whatever we already have
    }
  }

  await searchAndCollect(title)

  let uniqueCandidates = dedupeCandidates(candidates)
  let best = pickBestRankedSource(query, uniqueCandidates)

  if (!best && titleHasVersionMarkers(title)) {
    const strippedTitle = stripTitleVersionMarkers(title)
    if (strippedTitle) {
      await searchAndCollect(strippedTitle)
      uniqueCandidates = dedupeCandidates(candidates)
      best = pickBestRankedSource(query, uniqueCandidates)
    }
  }

  if (uniqueCandidates.length === 0 && !isOsuApiConfigured() && (beatmapSetId == null || beatmapSetId <= 0)) {
    const result: RankedSourceSuggestionResult = {
      kind: 'unavailable',
      message: 'Could not look up a ranked source on osu!.'
    }
    if (!options?.refresh) setSourceSuggestionCached(cacheKey, result)
    return result
  }

  const bestResult = best
  let result: RankedSourceSuggestionResult

  if (!bestResult) {
    const rankedMatches = uniqueCandidates.filter(
      (candidate) =>
        metadataMatchesCandidate(query, candidate) && isRankedStatus(candidate.status)
    )
    if (rankedMatches.length > 0) {
      result = { kind: 'no_source' }
    } else if (!isOsuApiConfigured()) {
      result = {
        kind: 'unavailable',
        message: 'Could not look up a ranked source on osu!.'
      }
    } else {
      result = { kind: 'not_found' }
    }
  } else {
    result = found(bestResult)
  }

  if (result.kind === 'found') {
    setSourceSuggestionCached(cacheKey, result)
  }

  return result
}
