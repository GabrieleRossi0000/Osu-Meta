import { decodeOsuFile } from './osu-file'

const USER_AGENT = 'OsuMeta/1.0'

export async function downloadBeatmapOsuText(beatmapId: number): Promise<string | null> {
  if (beatmapId <= 0) return null

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15_000)

  try {
    const response = await fetch(`https://osu.ppy.sh/beatmaps/${beatmapId}/download`, {
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal
    })
    if (!response.ok) return null

    const buffer = Buffer.from(await response.arrayBuffer())
    if (buffer.length === 0) return null

    return decodeOsuFile(buffer).text
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}
