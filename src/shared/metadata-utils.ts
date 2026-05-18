import type { BeatmapMetadata } from './types'

export function metadataEquals(a: BeatmapMetadata, b: BeatmapMetadata): boolean {
  return (
    a.artist === b.artist &&
    a.artistUnicode === b.artistUnicode &&
    a.title === b.title &&
    a.titleUnicode === b.titleUnicode &&
    a.tags === b.tags
  )
}
