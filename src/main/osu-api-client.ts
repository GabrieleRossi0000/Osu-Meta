import type { SourceMatchCandidate } from '../shared/source-match'
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

export async function fetchBeatmapsetFromApi(
  beatmapSetId: number
): Promise<SourceMatchCandidate | null> {
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
  return toCandidate(set)
}
