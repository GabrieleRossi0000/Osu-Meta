/** Beatmap set ID from .osu metadata and/or osu! folder name prefix (`12345 Artist - Title`). */
export function resolveBeatmapSetId(set: {
  beatmapSetId: number | null
  folderName: string
}): number | null {
  if (set.beatmapSetId != null && set.beatmapSetId > 0) {
    return set.beatmapSetId
  }
  const match = /^(\d+)\s/.exec(set.folderName)
  if (!match) return null
  const id = Number.parseInt(match[1], 10)
  return Number.isFinite(id) && id > 0 ? id : null
}

export function beatmapSetPageUrl(setId: number): string {
  return `https://osu.ppy.sh/beatmapsets/${setId}`
}
