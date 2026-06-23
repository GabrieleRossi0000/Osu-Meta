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

interface ApiBeatmapOwner {
  id?: number
  username?: string
}

interface ApiBeatmapExtended {
  id?: number
  mode?: string
  user_id?: number
  version?: string
  owners?: ApiBeatmapOwner[]
  genre?: { id?: number; name?: string }
  language?: { id?: number; name?: string }
}

interface ApiBeatmapset {
  id: number
  user_id?: number
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
  genre?: { id?: number; name?: string }
  language?: { id?: number; name?: string }
  beatmaps?: ApiBeatmapExtended[]
}

export interface BeatmapsetApiDetails extends SourceMatchCandidate {
  tags: string
  genre: string
  language: string
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
): Promise<BeatmapsetApiDetails | null> {
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
  return {
    ...toCandidate(set),
    tags: set.tags ?? '',
    genre: set.genre?.name?.trim() ?? '',
    language: set.language?.name?.trim() ?? ''
  }
}

export interface BeatmapsetExtendedInfo {
  userId: number
  beatmaps: Array<{
    userId: number
    owners: Array<{ id: number; username: string }>
  }>
}

export interface OsuUserProfile {
  id: number
  username: string
  previousUsernames: string[]
}

export interface UserBeatmapsetTagContext {
  beatmapSetId: number
  tags: string
}

const API_CACHE_TTL_MS = 15 * 60 * 1000

interface CacheEntry<T> {
  expiresAt: number
  value: T
}

const profileCache = new Map<number, CacheEntry<OsuUserProfile | null>>()
const userBeatmapsetContextCache = new Map<string, CacheEntry<UserBeatmapsetTagContext | null>>()

function readCache<T>(cache: Map<number | string, CacheEntry<T>>, key: number | string): T | undefined {
  const entry = cache.get(key)
  if (!entry) return undefined
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key)
    return undefined
  }
  return entry.value
}

function writeCache<T>(cache: Map<number | string, CacheEntry<T>>, key: number | string, value: T): void {
  cache.set(key, { expiresAt: Date.now() + API_CACHE_TTL_MS, value })
}

function sortBeatmapsetsByRankedDate(sets: ApiBeatmapset[]): ApiBeatmapset[] {
  return [...sets].sort((a, b) => parseLeaderboardDateMs(b) - parseLeaderboardDateMs(a))
}

export async function fetchBeatmapsetExtended(
  beatmapSetId: number
): Promise<BeatmapsetExtendedInfo | null> {
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
  if (typeof set.id !== 'number' || typeof set.user_id !== 'number') return null

  const beatmaps = (set.beatmaps ?? [])
    .map((beatmap) => {
      const userId = beatmap.user_id
      if (typeof userId !== 'number' || userId <= 0) return null

      const owners = (beatmap.owners ?? [])
        .filter((owner): owner is { id: number; username: string } => {
          return typeof owner.id === 'number' && typeof owner.username === 'string'
        })
        .map((owner) => ({ id: owner.id, username: owner.username }))

      return { userId, owners }
    })
    .filter((beatmap): beatmap is BeatmapsetExtendedInfo['beatmaps'][number] => beatmap !== null)

  return { userId: set.user_id, beatmaps }
}

export async function fetchUserProfile(userId: number): Promise<OsuUserProfile | null> {
  if (userId <= 0) return null

  const cached = readCache(profileCache, userId)
  if (cached !== undefined) return cached

  const accessToken = await getAccessToken()
  if (!accessToken) return null

  const response = await fetch(`${API_BASE}/users/${userId}`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': USER_AGENT
    }
  })

  if (!response.ok) {
    writeCache(profileCache, userId, null)
    return null
  }

  const payload = (await response.json()) as {
    id?: number
    username?: string
    previous_usernames?: string[]
  }

  if (typeof payload.id !== 'number' || typeof payload.username !== 'string') {
    writeCache(profileCache, userId, null)
    return null
  }

  const previousNames = new Set<string>()
  for (const name of payload.previous_usernames ?? []) {
    if (typeof name === 'string' && name.trim()) previousNames.add(name.trim())
  }

  const profile: OsuUserProfile = {
    id: payload.id,
    username: payload.username,
    previousUsernames: [...previousNames]
  }

  writeCache(profileCache, userId, profile)
  return profile
}

export async function fetchUserLatestBeatmapsetTagContext(
  userId: number,
  type: 'ranked' | 'guest'
): Promise<UserBeatmapsetTagContext | null> {
  if (userId <= 0) return null

  const cacheKey = `${userId}:${type}:context`
  const cached = readCache(userBeatmapsetContextCache, cacheKey)
  if (cached !== undefined) return cached

  const accessToken = await getAccessToken()
  if (!accessToken) return null

  const url = new URL(`${API_BASE}/users/${userId}/beatmapsets/${type}`)
  url.searchParams.set('limit', '5')

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': USER_AGENT
    }
  })

  if (!response.ok) {
    writeCache(userBeatmapsetContextCache, cacheKey, null)
    return null
  }

  const sets = (await response.json()) as ApiBeatmapset[]
  const latest = sortBeatmapsetsByRankedDate(sets)[0]
  const tags = latest?.tags?.trim() ?? ''
  const beatmapSetId = typeof latest?.id === 'number' ? latest.id : 0
  const context =
    beatmapSetId > 0 && tags.length > 0 ? { beatmapSetId, tags } : null

  writeCache(userBeatmapsetContextCache, cacheKey, context)
  return context
}

export async function fetchUserLatestBeatmapsetTags(
  userId: number,
  type: 'ranked' | 'guest'
): Promise<string | null> {
  const context = await fetchUserLatestBeatmapsetTagContext(userId, type)
  return context?.tags ?? null
}
