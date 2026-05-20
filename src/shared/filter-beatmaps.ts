import { resolveBeatmapSetId } from './beatmap-set-id'
import type { BeatmapSetSummary } from './types'

export function filterBeatmaps(
  beatmaps: BeatmapSetSummary[],
  search: string
): BeatmapSetSummary[] {
  const q = search.trim().toLowerCase()
  if (!q) return beatmaps

  const setIdQuery = search.trim()
  const isSetIdQuery = /^\d+$/.test(setIdQuery)

  if (isSetIdQuery) {
    return beatmaps.filter((b) => {
      const id = resolveBeatmapSetId(b)
      return id != null && String(id).includes(setIdQuery)
    })
  }

  return beatmaps.filter(
    (b) => b.displayName.toLowerCase().includes(q) || b.folderName.toLowerCase().includes(q)
  )
}
