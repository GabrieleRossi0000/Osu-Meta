import type { BeatmapSetSummary } from './types'

export function filterBeatmaps(
  beatmaps: BeatmapSetSummary[],
  search: string
): BeatmapSetSummary[] {
  const q = search.trim().toLowerCase()
  if (!q) return beatmaps
  return beatmaps.filter(
    (b) =>
      b.displayName.toLowerCase().includes(q) || b.folderName.toLowerCase().includes(q)
  )
}
