import {
  getBeatmapSetOnlineCached,
  getFeaturedArtistCached,
  setBeatmapSetOnlineCached,
  setFeaturedArtistCached
} from './settings'

const USER_AGENT = 'OsuMeta/1.0'

export interface OsuBeatmapSetInfo {
  online: boolean
  isFeaturedArtist: boolean
}

export async function checkBeatmapSetOnline(beatmapSetId: number): Promise<boolean> {
  const info = await inspectOsuBeatmapSet(beatmapSetId)
  return info.online
}

export async function inspectOsuBeatmapSet(beatmapSetId: number): Promise<OsuBeatmapSetInfo> {
  if (beatmapSetId <= 0) {
    return { online: false, isFeaturedArtist: false }
  }

  const onlineCached = getBeatmapSetOnlineCached(beatmapSetId)
  const faCached = getFeaturedArtistCached(beatmapSetId)
  if (onlineCached === false) {
    return { online: false, isFeaturedArtist: false }
  }
  if (onlineCached === true && faCached !== undefined) {
    return { online: true, isFeaturedArtist: faCached }
  }

  try {
    const response = await fetch(`https://osu.ppy.sh/beatmapsets/${beatmapSetId}`, {
      headers: { 'User-Agent': USER_AGENT }
    })
    if (!response.ok) {
      setBeatmapSetOnlineCached(beatmapSetId, false)
      setFeaturedArtistCached(beatmapSetId, false)
      return { online: false, isFeaturedArtist: false }
    }

    const html = await response.text()
    const isFeatured =
      html.includes('"featured_artist":true') || html.includes('"featured_artist": true')

    setBeatmapSetOnlineCached(beatmapSetId, true)
    setFeaturedArtistCached(beatmapSetId, isFeatured)
    return { online: true, isFeaturedArtist: isFeatured }
  } catch {
    setBeatmapSetOnlineCached(beatmapSetId, false)
    setFeaturedArtistCached(beatmapSetId, false)
    return { online: false, isFeaturedArtist: false }
  }
}
