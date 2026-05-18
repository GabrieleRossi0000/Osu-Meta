import type { BeatmapSetSummary } from './types'

export function normalizeDisplayKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
}

function splitArtistTitle(value: string): { artist: string; title: string } | null {
  const trimmed = value.trim()
  const sep = trimmed.indexOf(' - ')
  if (sep <= 0) return null
  const artist = trimmed.slice(0, sep).trim()
  const title = trimmed.slice(sep + 3).trim()
  if (!artist || !title) return null
  return { artist, title }
}

export function matchBeatmapByDisplayTitle(
  beatmaps: BeatmapSetSummary[],
  displayTitle: string
): BeatmapSetSummary | undefined {
  const trimmed = displayTitle.trim()
  if (!trimmed) return undefined

  const lower = trimmed.toLowerCase()
  const norm = normalizeDisplayKey(trimmed)

  const exact = beatmaps.find((b) => b.displayName.toLowerCase() === lower)
  if (exact) return exact

  const normalized = beatmaps.find((b) => normalizeDisplayKey(b.displayName) === norm)
  if (normalized) return normalized

  const parts = splitArtistTitle(trimmed)
  if (parts) {
    const partNorm = normalizeDisplayKey(`${parts.artist}${parts.title}`)
    const byParts = beatmaps.find((b) => normalizeDisplayKey(b.displayName) === partNorm)
    if (byParts) return byParts
  }

  const contains = beatmaps.filter(
    (b) =>
      b.displayName.toLowerCase().includes(lower) ||
      lower.includes(b.displayName.toLowerCase())
  )
  if (contains.length === 1) return contains[0]

  return undefined
}

export function matchBeatmapBySetId(
  beatmaps: BeatmapSetSummary[],
  setId: number
): BeatmapSetSummary | undefined {
  if (setId <= 0) return undefined
  return beatmaps.find((b) => b.beatmapSetId === setId)
}
