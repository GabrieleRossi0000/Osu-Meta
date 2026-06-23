import { comboColoursEqual, formatOsuComboLine, rgbTupleToHex } from './combo-colours'
import {
  getMismatchedMetadataFields,
  metadataFieldLabel,
  type MetadataEditableKey
} from './metadata-utils'
import type { BeatmapComboColour, BeatmapMetadata } from './types'

export interface DifficultyFileRef {
  version: string
  filename: string
}

export interface DifficultyValueEntry extends DifficultyFileRef {
  value: string
}

export interface MetadataFieldMismatchDetail {
  field: MetadataEditableKey
  label: string
  entries: DifficultyValueEntry[]
}

export interface DifficultyGeneralSettings extends DifficultyFileRef {
  genre: string
  language: string
}

export interface ComboColourMismatchGroup {
  summary: string
  comboColours: BeatmapComboColour[]
  entries: DifficultyFileRef[]
}

export interface PerDifficultyMetadataSnapshot extends DifficultyFileRef {
  metadata: BeatmapMetadata
}

export interface PerDifficultyComboSnapshot extends DifficultyFileRef {
  comboColours: BeatmapComboColour[]
}

function displayValue(value: string): string {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : '(empty)'
}

export function formatComboColoursSummary(comboColours: BeatmapComboColour[]): string {
  if (comboColours.length === 0) return '(no combo colours)'
  return comboColours
    .map((colour, index) => `${index + 1}: ${rgbTupleToHex(colour)}`)
    .join(' · ')
}

function comboColoursKey(comboColours: BeatmapComboColour[]): string {
  return comboColours.map((c) => `${c.r},${c.g},${c.b}`).join('|')
}

export function buildMetadataMismatchDetails(
  snapshots: PerDifficultyMetadataSnapshot[]
): MetadataFieldMismatchDetail[] {
  if (snapshots.length <= 1) return []

  const mismatchedFields = getMismatchedMetadataFields(snapshots.map((entry) => entry.metadata))
  return mismatchedFields.map((field) => ({
    field,
    label: metadataFieldLabel(field),
    entries: snapshots.map((entry) => ({
      version: entry.version,
      filename: entry.filename,
      value: displayValue(entry.metadata[field])
    }))
  }))
}

export function buildComboColourMismatchDetails(
  snapshots: PerDifficultyComboSnapshot[]
): ComboColourMismatchGroup[] {
  if (snapshots.length <= 1) return []

  const primary = snapshots[0].comboColours
  const hasMismatch = snapshots.some((entry) => !comboColoursEqual(primary, entry.comboColours))
  if (!hasMismatch) return []

  const groups = new Map<string, ComboColourMismatchGroup>()

  for (const entry of snapshots) {
    const key = comboColoursKey(entry.comboColours)
    const existing = groups.get(key)
    const ref = { version: entry.version, filename: entry.filename }
    if (existing) {
      existing.entries.push(ref)
      continue
    }
    groups.set(key, {
      summary: formatComboColoursSummary(entry.comboColours),
      comboColours: entry.comboColours,
      entries: [ref]
    })
  }

  return [...groups.values()].sort((a, b) => b.entries.length - a.entries.length)
}

export function isDifficultyValueMatching(
  value: string,
  entries: DifficultyValueEntry[]
): boolean {
  if (value === '(empty)') return false
  return entries.filter((entry) => entry.value === value).length >= 2
}

export function isComboPaletteMatching(
  comboColours: BeatmapComboColour[],
  snapshots: PerDifficultyComboSnapshot[]
): boolean {
  if (snapshots.length <= 1) return true
  const key = comboColoursKey(comboColours)
  return snapshots.filter((entry) => comboColoursKey(entry.comboColours) === key).length >= 2
}

export interface MetadataValueGroup {
  value: string
  difficulties: DifficultyFileRef[]
  matching: boolean
}

export function groupMetadataEntriesByValue(entries: DifficultyValueEntry[]): MetadataValueGroup[] {
  const groups = new Map<string, DifficultyFileRef[]>()

  for (const entry of entries) {
    const list = groups.get(entry.value) ?? []
    list.push({ version: entry.version, filename: entry.filename })
    groups.set(entry.value, list)
  }

  return [...groups.entries()]
    .map(([value, difficulties]) => ({
      value,
      difficulties,
      matching: isDifficultyValueMatching(value, entries)
    }))
    .sort((a, b) => b.difficulties.length - a.difficulties.length)
}

export function formatDifficultyList(refs: DifficultyFileRef[], maxShown = 6): string {
  const names = refs.map((ref) => ref.version || ref.filename)
  if (names.length <= maxShown) return names.join(', ')
  return `${names.slice(0, maxShown).join(', ')} +${names.length - maxShown} more`
}

export function collectUniqueGenres(settings: DifficultyGeneralSettings[]): string[] {
  return [...new Set(settings.map((entry) => entry.genre.trim()).filter(Boolean))].sort()
}

export function collectUniqueLanguages(settings: DifficultyGeneralSettings[]): string[] {
  return [...new Set(settings.map((entry) => entry.language.trim()).filter(Boolean))].sort()
}

/** For debugging — full osu combo line list. */
export function formatComboColoursOsuLines(comboColours: BeatmapComboColour[]): string {
  if (comboColours.length === 0) return '(none)'
  return comboColours.map((colour, index) => formatOsuComboLine(index + 1, colour)).join('; ')
}
