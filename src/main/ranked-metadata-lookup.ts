import {
  dedupeSourceMatchCandidates,
  pickLatestRankedMetadataMatch,
  uniqueMetadataSearchTitles,
  type SourceMatchCandidate,
  type SourceMatchQuery
} from '../shared/source-match'
import {
  fetchBeatmapsetFromApi,
  isOsuApiConfigured,
  searchRankedBeatmapsetsByArtist,
  searchRankedBeatmapsetsByMetadata
} from './osu-api-client'
import {
  fetchBeatmapsetFromWebPage,
  toSourceMatchCandidate
} from './osu-beatmapset-web'

function artistForSearch(query: SourceMatchQuery): string {
  return query.artistUnicode.trim() || query.artist.trim()
}

function titleForSearch(query: SourceMatchQuery): string {
  return query.titleUnicode.trim() || query.title.trim()
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

export async function loadBeatmapSetMetadataCandidate(
  beatmapSetId: number
): Promise<SourceMatchCandidate | null> {
  return loadCandidateFromSetId(beatmapSetId)
}

export async function collectRankedMetadataCandidates(
  query: SourceMatchQuery,
  beatmapSetId: number | null
): Promise<SourceMatchCandidate[]> {
  const artist = artistForSearch(query)
  const title = titleForSearch(query)
  if (!artist || !title) return []

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

  for (const searchTitle of uniqueMetadataSearchTitles(title)) {
    await searchAndCollect(searchTitle)
  }

  let uniqueCandidates = dedupeSourceMatchCandidates(candidates)
  let best = pickLatestRankedMetadataMatch(query, uniqueCandidates)

  if (!best) {
    try {
      const artistResults = await searchRankedBeatmapsetsByArtist(artist)
      candidates.push(...artistResults)
    } catch {
      // fall through
    }
    uniqueCandidates = dedupeSourceMatchCandidates(candidates)
    best = pickLatestRankedMetadataMatch(query, uniqueCandidates)
  }

  return uniqueCandidates
}
