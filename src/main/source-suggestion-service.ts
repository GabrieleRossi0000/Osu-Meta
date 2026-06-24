import {
  buildSourceSuggestionCacheKey,
  isRankedStatus,
  metadataMatchesCandidate,
  pickBestRankedSource,
  pickLatestRankedMetadataMatch,
  type SourceMatchCandidate,
  type SourceMatchQuery
} from '../shared/source-match'
import type {
  RankedMetadataMatch,
  RankedMetadataMatchResult,
  RankedSourceSuggestion,
  RankedSourceSuggestionResult
} from '../shared/types'
import { isOsuApiConfigured } from './osu-api-client'
import {
  collectRankedMetadataCandidates,
  loadBeatmapSetMetadataCandidate
} from './ranked-metadata-lookup'
import { getSourceSuggestionCached, setSourceSuggestionCached } from './settings'

function toRankedMetadataMatch(candidate: SourceMatchCandidate): RankedMetadataMatch {
  return {
    beatmapSetId: candidate.beatmapSetId,
    artist: candidate.artist.trim(),
    artistUnicode: (candidate.artistUnicode || candidate.artist).trim(),
    title: candidate.title.trim(),
    titleUnicode: (candidate.titleUnicode || candidate.title).trim(),
    source: candidate.source.trim(),
    creator: candidate.creator,
    status: candidate.status
  }
}

function toSuggestion(candidate: SourceMatchCandidate): RankedSourceSuggestion {
  const match = toRankedMetadataMatch(candidate)
  return {
    source: match.source,
    beatmapSetId: match.beatmapSetId,
    artist: match.artist,
    artistUnicode: match.artistUnicode,
    title: match.title,
    titleUnicode: match.titleUnicode,
    creator: match.creator,
    status: match.status
  }
}

function found(candidate: SourceMatchCandidate): RankedSourceSuggestionResult {
  return { kind: 'found', suggestion: toSuggestion(candidate) }
}

export async function suggestRankedMetadataMatch(
  query: SourceMatchQuery,
  beatmapSetId: number | null
): Promise<RankedMetadataMatchResult> {
  const artist = query.artistUnicode.trim() || query.artist.trim()
  const title = query.titleUnicode.trim() || query.title.trim()
  if (!artist || !title) {
    return { kind: 'unavailable', message: 'Artist and title are required.' }
  }

  // Submitted sets: use this beatmap's osu! metadata first (any status).
  if (beatmapSetId != null && beatmapSetId > 0) {
    const direct = await loadBeatmapSetMetadataCandidate(beatmapSetId)
    if (direct && metadataMatchesCandidate(query, direct)) {
      return { kind: 'found', match: toRankedMetadataMatch(direct) }
    }
  }

  // Fall back to ranked/qualified reference sets (same search as unsubmitted maps).
  const candidates = await collectRankedMetadataCandidates(
    query,
    beatmapSetId != null && beatmapSetId > 0 ? null : beatmapSetId
  )
  const best = pickLatestRankedMetadataMatch(query, candidates)

  if (!best) {
    if (candidates.length === 0 && !isOsuApiConfigured() && (beatmapSetId == null || beatmapSetId <= 0)) {
      return {
        kind: 'unavailable',
        message: 'Could not look up ranked metadata on osu!.'
      }
    }
    return { kind: 'not_found' }
  }

  return { kind: 'found', match: toRankedMetadataMatch(best) }
}

export async function suggestRankedSource(
  query: SourceMatchQuery,
  beatmapSetId: number | null,
  options?: { refresh?: boolean }
): Promise<RankedSourceSuggestionResult> {
  const artist = query.artistUnicode.trim() || query.artist.trim()
  const title = query.titleUnicode.trim() || query.title.trim()
  if (!artist || !title) {
    return { kind: 'unavailable', message: 'Artist and title are required.' }
  }

  const cacheKey = `${buildSourceSuggestionCacheKey(query)}::meta4`
  if (!options?.refresh) {
    const cached = getSourceSuggestionCached(cacheKey)
    if (cached) return cached
  }

  const uniqueCandidates = await collectRankedMetadataCandidates(query, beatmapSetId)
  const best = pickBestRankedSource(query, uniqueCandidates)

  if (uniqueCandidates.length === 0 && !isOsuApiConfigured() && (beatmapSetId == null || beatmapSetId <= 0)) {
    const result: RankedSourceSuggestionResult = {
      kind: 'unavailable',
      message: 'Could not look up a ranked source on osu!.'
    }
    if (!options?.refresh) setSourceSuggestionCached(cacheKey, result)
    return result
  }

  let result: RankedSourceSuggestionResult

  if (!best) {
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
    result = found(best)
  }

  if (result.kind === 'found') {
    setSourceSuggestionCached(cacheKey, result)
  }

  return result
}
