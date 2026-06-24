import {
  getBeatmapSetOnlineCached,
  getBeatmapSetStatusCached,
  getFeaturedArtistCached,
  setBeatmapSetOnlineCached,
  setBeatmapSetStatusCached,
  setFeaturedArtistCached
} from './settings'
import { fetchBeatmapsetFromWebPage } from './osu-beatmapset-web'

const USER_AGENT = 'OsuMeta/1.0'

export interface OsuBeatmapSetInfo {
  online: boolean
  isFeaturedArtist: boolean
  status: string | null
}

export async function checkBeatmapSetOnline(beatmapSetId: number): Promise<boolean> {
  const info = await inspectOsuBeatmapSet(beatmapSetId)
  return info.online
}

async function readFeaturedArtistFromHtml(beatmapSetId: number): Promise<boolean> {
  try {
    const response = await fetch(`https://osu.ppy.sh/beatmapsets/${beatmapSetId}`, {
      headers: { 'User-Agent': USER_AGENT }
    })
    if (!response.ok) return false
    const html = await response.text()
    return html.includes('"featured_artist":true') || html.includes('"featured_artist": true')
  } catch {
    return false
  }
}

/** Status lookup for sidebar cards — uses web JSON cache when possible. */
export async function inspectBeatmapSetStatus(
  beatmapSetId: number
): Promise<Pick<OsuBeatmapSetInfo, 'online' | 'status' | 'isFeaturedArtist'>> {
  if (beatmapSetId <= 0) {
    return { online: false, status: null, isFeaturedArtist: false }
  }

  const onlineCached = getBeatmapSetOnlineCached(beatmapSetId)
  const statusCached = getBeatmapSetStatusCached(beatmapSetId)
  const faCached = getFeaturedArtistCached(beatmapSetId)

  if (onlineCached === false) {
    return { online: false, status: null, isFeaturedArtist: false }
  }

  if (onlineCached === true && statusCached) {
    let isFeaturedArtist = faCached ?? false
    if (faCached === undefined) {
      isFeaturedArtist = await readFeaturedArtistFromHtml(beatmapSetId)
      setFeaturedArtistCached(beatmapSetId, isFeaturedArtist)
    }
    return { online: true, status: statusCached, isFeaturedArtist }
  }

  const fromWeb = await fetchBeatmapsetFromWebPage(beatmapSetId)
  if (!fromWeb) {
    setBeatmapSetOnlineCached(beatmapSetId, false)
    setFeaturedArtistCached(beatmapSetId, false)
    return { online: false, status: null, isFeaturedArtist: false }
  }

  const status = fromWeb.status?.trim() || null
  setBeatmapSetOnlineCached(beatmapSetId, true)
  if (status) setBeatmapSetStatusCached(beatmapSetId, status)

  let isFeaturedArtist = faCached
  if (isFeaturedArtist === undefined) {
    isFeaturedArtist = await readFeaturedArtistFromHtml(beatmapSetId)
    setFeaturedArtistCached(beatmapSetId, isFeaturedArtist)
  }

  return { online: true, status, isFeaturedArtist }
}

export async function inspectOsuBeatmapSet(beatmapSetId: number): Promise<OsuBeatmapSetInfo> {
  if (beatmapSetId <= 0) {
    return { online: false, isFeaturedArtist: false, status: null }
  }

  const onlineCached = getBeatmapSetOnlineCached(beatmapSetId)
  const faCached = getFeaturedArtistCached(beatmapSetId)
  const statusCached = getBeatmapSetStatusCached(beatmapSetId)

  if (onlineCached === false) {
    return { online: false, isFeaturedArtist: false, status: null }
  }

  if (onlineCached === true && faCached !== undefined && statusCached) {
    return { online: true, isFeaturedArtist: faCached, status: statusCached }
  }

  const statusInfo = await inspectBeatmapSetStatus(beatmapSetId)
  if (!statusInfo.online) {
    setFeaturedArtistCached(beatmapSetId, false)
    return { online: false, isFeaturedArtist: false, status: null }
  }

  let isFeatured = faCached
  if (isFeatured === undefined) {
    isFeatured = await readFeaturedArtistFromHtml(beatmapSetId)
    setFeaturedArtistCached(beatmapSetId, isFeatured)
  }

  return {
    online: true,
    isFeaturedArtist: isFeatured,
    status: statusInfo.status
  }
}
