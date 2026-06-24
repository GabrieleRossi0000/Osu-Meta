import { getRomanizedFieldLocks } from './romanization'
import { normalizeMetadataText } from './source-match'
import type { BeatmapMetadata, RankedMetadataMatch } from './types'

export type RankedMetadataApplyMode = 'fillEmpty' | 'overwriteMismatches'

export type RankedMetadataApplyFieldKey = keyof BeatmapMetadata

export interface RankedMetadataApplyField {
  key: RankedMetadataApplyFieldKey
  label: string
  current: string
  suggested: string
}

const FIELD_LABELS: Record<RankedMetadataApplyFieldKey, string> = {
  artistUnicode: 'Artist name',
  artist: 'Romanized artist',
  titleUnicode: 'Song title',
  title: 'Romanized title',
  source: 'Source',
  tags: 'Tags'
}

function valuesMatch(a: string, b: string): boolean {
  return normalizeMetadataText(a) === normalizeMetadataText(b)
}

function shouldApplyField(
  current: string,
  suggested: string,
  mode: RankedMetadataApplyMode
): boolean {
  if (!suggested.trim()) return false
  if (current.trim() === suggested.trim()) return false
  if (mode === 'fillEmpty') return !current.trim()
  return !valuesMatch(current, suggested)
}

export function buildRankedMetadataSuggestion(
  match: RankedMetadataMatch,
  rankedTags: string
): BeatmapMetadata {
  return {
    artistUnicode: (match.artistUnicode || match.artist).trim(),
    artist: match.artist.trim(),
    titleUnicode: (match.titleUnicode || match.title).trim(),
    title: match.title.trim(),
    source: match.source.trim(),
    tags: rankedTags.trim()
  }
}

export function buildRankedMetadataApplyFields(
  metadata: BeatmapMetadata,
  suggested: BeatmapMetadata,
  mode: RankedMetadataApplyMode
): RankedMetadataApplyField[] {
  const locks = getRomanizedFieldLocks(metadata)
  const fields: RankedMetadataApplyField[] = []

  const entries: Array<{ key: RankedMetadataApplyFieldKey; skip?: boolean }> = [
    { key: 'artistUnicode' },
    { key: 'artist', skip: locks.artist },
    { key: 'titleUnicode' },
    { key: 'title', skip: locks.title },
    { key: 'source' },
    { key: 'tags' }
  ]

  for (const entry of entries) {
    if (entry.skip) continue
    const current = metadata[entry.key]
    const next = suggested[entry.key]
    if (!shouldApplyField(current, next, mode)) continue
    fields.push({
      key: entry.key,
      label: FIELD_LABELS[entry.key],
      current,
      suggested: next
    })
  }

  return fields
}

export function applyRankedMetadataFields(
  metadata: BeatmapMetadata,
  fields: RankedMetadataApplyField[]
): BeatmapMetadata {
  const next = { ...metadata }
  for (const field of fields) {
    next[field.key] = field.suggested
  }
  return next
}
