import { comboColoursEqual } from './combo-colours'
import type { BeatmapComboColour, BeatmapMetadata, SaveMetadataPayload } from './types'

export function normalizeBeatmapMetadata(metadata: Partial<BeatmapMetadata> | null | undefined): BeatmapMetadata {
  return {
    artist: metadata?.artist ?? '',
    artistUnicode: metadata?.artistUnicode ?? '',
    title: metadata?.title ?? '',
    titleUnicode: metadata?.titleUnicode ?? '',
    source: metadata?.source ?? '',
    tags: metadata?.tags ?? ''
  }
}

/** Accepts current payload shape or legacy separate metadata argument from older builds. */
export function coerceSaveMetadataPayload(
  payload: SaveMetadataPayload | BeatmapMetadata,
  comboColours?: BeatmapComboColour[],
  savedMetadata?: BeatmapMetadata,
  savedComboColours?: BeatmapComboColour[]
): SaveMetadataPayload {
  if (
    payload &&
    typeof payload === 'object' &&
    'metadata' in payload &&
    'savedMetadata' in payload &&
    'comboColours' in payload &&
    'savedComboColours' in payload
  ) {
    const typed = payload as SaveMetadataPayload
    return {
      metadata: normalizeBeatmapMetadata(typed.metadata),
      comboColours: typed.comboColours ?? [],
      savedMetadata: normalizeBeatmapMetadata(typed.savedMetadata),
      savedComboColours: typed.savedComboColours ?? []
    }
  }

  const metadata = normalizeBeatmapMetadata(payload as BeatmapMetadata)
  return {
    metadata,
    comboColours: comboColours ?? [],
    savedMetadata: normalizeBeatmapMetadata(savedMetadata ?? metadata),
    savedComboColours: savedComboColours ?? comboColours ?? []
  }
}

export const METADATA_EDITABLE_KEYS = [
  'artist',
  'artistUnicode',
  'title',
  'titleUnicode',
  'source',
  'tags'
] as const satisfies readonly (keyof BeatmapMetadata)[]

export type MetadataEditableKey = (typeof METADATA_EDITABLE_KEYS)[number]

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

export function getDirtyMetadataFields(
  current: BeatmapMetadata,
  saved: BeatmapMetadata
): MetadataEditableKey[] {
  return METADATA_EDITABLE_KEYS.filter((key) => current[key] !== saved[key])
}

export function getMismatchedMetadataFields(metadatas: BeatmapMetadata[]): MetadataEditableKey[] {
  if (metadatas.length <= 1) return []
  const primary = metadatas[0]
  return METADATA_EDITABLE_KEYS.filter((key) =>
    metadatas.some((meta) => meta[key] !== primary[key])
  )
}

/** Prefer non-empty fields across difficulties — avoids blank tags when the first .osu file is empty. */
export function pickRepresentativeMetadata(metadatas: BeatmapMetadata[]): BeatmapMetadata {
  if (metadatas.length === 0) return normalizeBeatmapMetadata(null)

  const representative = { ...metadatas[0] }

  for (const key of METADATA_EDITABLE_KEYS) {
    if (key === 'tags') continue
    if (representative[key].trim()) continue
    const fallback = metadatas.find((meta) => meta[key].trim())
    if (fallback) representative[key] = fallback[key]
  }

  const bestTags = metadatas
    .map((meta) => meta.tags)
    .filter((tags) => tags.trim().length > 0)
    .sort((a, b) => b.trim().length - a.trim().length)[0]

  if (bestTags) representative.tags = bestTags

  return representative
}

export function metadataFieldLabel(key: MetadataEditableKey): string {
  switch (key) {
    case 'artistUnicode':
      return 'artist'
    case 'artist':
      return 'romanized artist'
    case 'titleUnicode':
      return 'title'
    case 'title':
      return 'romanized title'
    case 'source':
      return 'source'
    case 'tags':
      return 'tags'
    default:
      return key
  }
}
