import { inspectOsuBeatmapSet } from './beatmap-set-online'

export async function checkFeaturedArtistSet(beatmapSetId: number): Promise<boolean> {
  const info = await inspectOsuBeatmapSet(beatmapSetId)
  return info.isFeaturedArtist
}
