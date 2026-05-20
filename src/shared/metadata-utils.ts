import { comboColoursEqual } from './combo-colours'
import type { BeatmapComboColour, BeatmapMetadata } from './types'

export function metadataEquals(a: BeatmapMetadata, b: BeatmapMetadata): boolean {
  return (
    a.artist === b.artist &&
    a.artistUnicode === b.artistUnicode &&
    a.title === b.title &&
    a.titleUnicode === b.titleUnicode &&
    a.source === b.source &&
    a.tags === b.tags
  )
}

export function editorStateEquals(
  metaA: BeatmapMetadata,
  metaB: BeatmapMetadata,
  combosA: BeatmapComboColour[],
  combosB: BeatmapComboColour[]
): boolean {
  return metadataEquals(metaA, metaB) && comboColoursEqual(combosA, combosB)
}
