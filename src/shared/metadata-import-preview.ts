import { comboColoursEqual, rgbTupleToHex } from './combo-colours'
import type { BeatmapComboColour, BeatmapMetadata, ImportMetadataMode } from './types'

export interface ImportFieldPreview {
  key: keyof BeatmapMetadata
  label: string
  current: string
  next: string
  changed: boolean
}

export interface ImportComboPreview {
  current: BeatmapComboColour[]
  next: BeatmapComboColour[]
  changed: boolean
  currentSummary: string
  nextSummary: string
}

const FIELD_LABELS: Record<keyof BeatmapMetadata, string> = {
  artistUnicode: 'Artist',
  artist: 'Romanized artist',
  titleUnicode: 'Title',
  title: 'Romanized title',
  source: 'Source',
  tags: 'Tags'
}

function fieldsForMode(mode: ImportMetadataMode): (keyof BeatmapMetadata)[] {
  if (mode === 'full') {
    return ['artistUnicode', 'artist', 'titleUnicode', 'title', 'source', 'tags']
  }
  if (mode === 'tags') return ['tags']
  if (mode === 'song') {
    return ['artistUnicode', 'artist', 'titleUnicode', 'title', 'source']
  }
  return []
}

export function applyMetadataImportPreview(
  current: BeatmapMetadata,
  source: BeatmapMetadata,
  mode: ImportMetadataMode
): BeatmapMetadata {
  if (mode === 'full') return { ...source }
  if (mode === 'tags') return { ...current, tags: source.tags }
  return {
    ...current,
    artist: source.artist,
    artistUnicode: source.artistUnicode,
    title: source.title,
    titleUnicode: source.titleUnicode,
    source: source.source
  }
}

export function buildImportPreview(
  current: BeatmapMetadata,
  source: BeatmapMetadata,
  mode: ImportMetadataMode
): ImportFieldPreview[] {
  const result = applyMetadataImportPreview(current, source, mode)
  return fieldsForMode(mode).map((key) => ({
    key,
    label: FIELD_LABELS[key],
    current: current[key],
    next: result[key],
    changed: current[key] !== result[key]
  }))
}

function summarizeComboColours(colours: BeatmapComboColour[]): string {
  if (colours.length === 0) return '(none)'
  return colours.map((c) => rgbTupleToHex(c)).join(', ')
}

export function buildImportComboPreview(
  current: BeatmapComboColour[],
  source: BeatmapComboColour[]
): ImportComboPreview {
  return {
    current,
    next: source,
    changed: !comboColoursEqual(current, source),
    currentSummary: summarizeComboColours(current),
    nextSummary: summarizeComboColours(source)
  }
}

export function importPreviewHasChanges(
  previews: ImportFieldPreview[],
  comboPreview?: ImportComboPreview | null
): boolean {
  if (previews.some((entry) => entry.changed)) return true
  return comboPreview?.changed ?? false
}
