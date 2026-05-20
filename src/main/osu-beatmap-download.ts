import { decodeOsuFile } from './osu-file'

const USER_AGENT = 'OsuMeta/1.0'

export async function downloadBeatmapOsuText(beatmapId: number): Promise<string | null> {
  if (beatmapId <= 0) return null

  try {
    const response = await fetch(`https://osu.ppy.sh/beatmaps/${beatmapId}/download`, {
      headers: { 'User-Agent': USER_AGENT }
    })
    if (!response.ok) return null

    const buffer = Buffer.from(await response.arrayBuffer())
    if (buffer.length === 0) return null

    return decodeOsuFile(buffer).text
  } catch {
    return null
  }
}
