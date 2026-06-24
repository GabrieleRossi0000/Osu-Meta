import type { BeatmapSetStatusEntry } from '../shared/types'
import { inspectBeatmapSetStatus } from './beatmap-set-online'

const LOOKUP_CONCURRENCY = 4

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let nextIndex = 0

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const index = nextIndex
      nextIndex += 1
      results[index] = await mapper(items[index])
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker())
  await Promise.all(workers)
  return results
}

export async function resolveBeatmapSetStatuses(
  beatmapSetIds: number[]
): Promise<Record<number, BeatmapSetStatusEntry>> {
  const unique = [...new Set(beatmapSetIds.filter((id) => id > 0))]
  if (unique.length === 0) return {}

  const entries = await mapWithConcurrency(unique, LOOKUP_CONCURRENCY, async (beatmapSetId) => {
    const info = await inspectBeatmapSetStatus(beatmapSetId)
    return {
      beatmapSetId,
      online: info.online,
      status: info.status,
      isFeaturedArtist: info.isFeaturedArtist
    } satisfies BeatmapSetStatusEntry
  })

  const result: Record<number, BeatmapSetStatusEntry> = {}
  for (const entry of entries) {
    result[entry.beatmapSetId] = entry
  }
  return result
}
