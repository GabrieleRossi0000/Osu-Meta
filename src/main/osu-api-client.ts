import { extractOsuGameModes } from '../shared/osu-game-mode'
import {
  filterBeatmapsetSearchResults,
  scoreBeatmapsetSearchRelevance
} from '../shared/osu-beatmap-search-relevance'
import { resolveArtistTitleQuery, searchQueriesFor } from '../shared/osu-beatmap-search-query'
import { isLeaderboardBeatmapsetStatus, LEADERBOARD_BEATMAPSET_STATUSES } from '../shared/osu-beatmap-status'
import { fetchFirstBeatmapIdFromWebPage } from './osu-beatmapset-web'
import type { SourceMatchCandidate } from '../shared/source-match'
import type { OsuBeatmapsetSearchHit } from '../shared/types'
import { OSU_API_CLIENT_ID, OSU_API_CLIENT_SECRET } from './osu-api-credentials'

const USER_AGENT = 'OsuMeta/1.0'
const TOKEN_URL = 'https://osu.ppy.sh/oauth/token'
const API_BASE = 'https://osu.ppy.sh/api/v2'

interface TokenCache {
  accessToken: string
  expiresAtMs: number
}

let tokenCache: TokenCache | null = null

function getClientCredentials(): { clientId: string; clientSecret: string } | null {
  const clientId = process.env.OSU_CLIENT_ID?.trim() || OSU_API_CLIENT_ID.trim()
  const clientSecret = process.env.OSU_CLIENT_SECRET?.trim() || OSU_API_CLIENT_SECRET.trim()
  if (!clientId || !clientSecret) return null
  return { clientId, clientSecret }
}

export function isOsuApiConfigured(): boolean {
  return getClientCredentials() !== null
}

async function getAccessToken(): Promise<string | null> {
  const credentials = getClientCredentials()
  if (!credentials) return null

  if (tokenCache && tokenCache.expiresAtMs > Date.now() + 60_000) {
    return tokenCache.accessToken
  }

  const body = new URLSearchParams({
    client_id: credentials.clientId,
    client_secret: credentials.clientSecret,
    grant_type: 'client_credentials',
    scope: 'public'
  })

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body
  })

  if (!response.ok) return null

  const payload = (await response.json()) as {
    access_token?: string
    expires_in?: number
  }

  if (!payload.access_token) return null

  tokenCache = {
    accessToken: payload.access_token,
    expiresAtMs: Date.now() + Math.max(60, payload.expires_in ?? 3600) * 1000
  }

  return tokenCache.accessToken
}

interface ApiBeatmapset {
  id: number
  artist: string
  artist_unicode: string
  title: string
  title_unicode: string
  source: string
  status: string
  creator: string
  play_count: number
  ranked_date?: string
  last_updated?: string
  tags?: string
  beatmaps?: { id?: number; mode?: string }[]
}

function parseLeaderboardDateMs(set: ApiBeatmapset): number {
  const raw = set.ranked_date
  if (!raw) return 0
  const ms = Date.parse(raw)
  return Number.isFinite(ms) ? ms : 0
}

function toCandidate(set: ApiBeatmapset): SourceMatchCandidate {
  return {
    artist: set.artist,
    artistUnicode: set.artist_unicode,
    title: set.title,
    titleUnicode: set.title_unicode,
    source: set.source,
    status: set.status,
    beatmapSetId: set.id,
    creator: set.creator,
    playCount: set.play_count,
    rankedDate: set.ranked_date
  }
}

function pickCoverUrl(covers?: { cover?: string; card?: string; 'card@2x'?: string }): string | null {
  return covers?.['card@2x'] ?? covers?.card ?? covers?.cover ?? null
}

function toSearchHit(set: ApiBeatmapset & { covers?: { cover?: string; card?: string; 'card@2x'?: string } }): OsuBeatmapsetSearchHit {
  return {
    beatmapSetId: set.id,
    artist: set.artist,
    artistUnicode: set.artist_unicode,
    title: set.title,
    titleUnicode: set.title_unicode,
    creator: set.creator,
    status: set.status,
    coverUrl: pickCoverUrl(set.covers),
    leaderboardDateAt: parseLeaderboardDateMs(set),
    gameModes: extractOsuGameModes(set.beatmaps)
  }
}

export async function searchBeatmapsetsOnOsu(query: string): Promise<OsuBeatmapsetSearchHit[]> {
  const accessToken = await getAccessToken()
  const trimmed = query.trim()
  if (!accessToken || !trimmed) return []

  const parsed = resolveArtistTitleQuery(trimmed)
  const searchQueries = searchQueriesFor(trimmed)

  async function searchWithStatus(searchQuery: string, status: string): Promise<OsuBeatmapsetSearchHit[]> {
    const url = new URL(`${API_BASE}/beatmapsets/search`)
    url.searchParams.set('q', `${searchQuery} status=${status}`)

    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': USER_AGENT
      }
    })

    if (!response.ok) return []

    const payload = (await response.json()) as {
      beatmapsets?: (ApiBeatmapset & { covers?: { cover?: string } })[]
    }

    return (payload.beatmapsets ?? [])
      .filter((set) => isLeaderboardBeatmapsetStatus(set.status))
      .map(toSearchHit)
  }

  const batches = await Promise.all(
    searchQueries.flatMap((searchQuery) =>
      LEADERBOARD_BEATMAPSET_STATUSES.map((status) => searchWithStatus(searchQuery, status))
    )
  )

  const seen = new Map<number, OsuBeatmapsetSearchHit>()
  for (const batch of batches) {
    for (const hit of batch) {
      const existing = seen.get(hit.beatmapSetId)
      if (!existing || hit.leaderboardDateAt > existing.leaderboardDateAt) {
        seen.set(hit.beatmapSetId, hit)
      }
    }
  }

  const sorted = [...seen.values()].sort((a, b) => {
    const relevanceDiff =
      scoreBeatmapsetSearchRelevance(trimmed, b, parsed) -
      scoreBeatmapsetSearchRelevance(trimmed, a, parsed)
    if (relevanceDiff !== 0) return relevanceDiff
    return b.leaderboardDateAt - a.leaderboardDateAt
  })

  return filterBeatmapsetSearchResults(sorted, trimmed, parsed)
}

export async function searchRankedBeatmapsetsByMetadata(
  artist: string,
  title: string
): Promise<SourceMatchCandidate[]> {
  const accessToken = await getAccessToken()
  if (!accessToken) return []

  const query = [`artist=${artist}`, `title=${title}`, 'status=ranked'].join(' ')
  const url = new URL(`${API_BASE}/beatmapsets/search`)
  url.searchParams.set('q', query)

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': USER_AGENT
    }
  })

  if (!response.ok) return []

  const payload = (await response.json()) as { beatmapsets?: ApiBeatmapset[] }
  return (payload.beatmapsets ?? []).map(toCandidate)
}

export async function fetchFirstBeatmapIdFromSet(beatmapSetId: number): Promise<number | null> {
  if (beatmapSetId <= 0) return null

  const accessToken = await getAccessToken()
  if (accessToken) {
    try {
      const response = await fetch(`${API_BASE}/beatmapsets/${beatmapSetId}`, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`,
          'User-Agent': USER_AGENT
        }
      })
      if (response.ok) {
        const set = (await response.json()) as ApiBeatmapset
        const id = set.beatmaps?.find((bm) => typeof bm.id === 'number')?.id
        if (typeof id === 'number' && id > 0) return id
      }
    } catch {
      // fall through to web page
    }
  }

  return fetchFirstBeatmapIdFromWebPage(beatmapSetId)
}

export async function fetchBeatmapsetFromApi(
  beatmapSetId: number
): Promise<(SourceMatchCandidate & { tags: string }) | null> {
  const accessToken = await getAccessToken()
  if (!accessToken || beatmapSetId <= 0) return null

  const response = await fetch(`${API_BASE}/beatmapsets/${beatmapSetId}`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': USER_AGENT
    }
  })

  if (!response.ok) return null

  const set = (await response.json()) as ApiBeatmapset
  if (typeof set.id !== 'number') return null
  return { ...toCandidate(set), tags: set.tags ?? '' }
}
