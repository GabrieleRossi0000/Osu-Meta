import { getRomanizedFieldLocks } from './romanization'
import { normalizeMetadataText } from './source-match'
import type { BeatmapMetadata, RankedMetadataMatch } from './types'

export type RomanizationField = 'artistUnicode' | 'artist' | 'titleUnicode' | 'title'

export interface RomanizationFieldSuggestion {
  field: RomanizationField
  value: string
  beatmapSetId: number
  /** `fill` when the field is empty; `casing` when it matches but spelling/capitalization differs. */
  kind: 'fill' | 'casing'
}

function valuesMatch(a: string, b: string): boolean {
  return normalizeMetadataText(a) === normalizeMetadataText(b)
}

function hasDistinctUnicodePair(unicode: string, romanized: string): boolean {
  if (!unicode.trim() || !romanized.trim()) return false
  return !valuesMatch(unicode, romanized)
}

function pushSuggestion(
  suggestions: RomanizationFieldSuggestion[],
  suggestion: RomanizationFieldSuggestion
): void {
  if (suggestions.some((entry) => entry.field === suggestion.field)) return
  suggestions.push(suggestion)
}

function maybeSuggestCasingFix(
  suggestions: RomanizationFieldSuggestion[],
  field: RomanizationField,
  current: string,
  ranked: string,
  beatmapSetId: number,
  enabled = true
): void {
  if (!enabled || !ranked.trim() || !current.trim()) return
  if (current === ranked) return
  if (!valuesMatch(current, ranked)) return
  pushSuggestion(suggestions, { field, value: ranked, beatmapSetId, kind: 'casing' })
}

export function getRomanizationFieldSuggestions(
  metadata: BeatmapMetadata,
  match: RankedMetadataMatch
): RomanizationFieldSuggestion[] {
  const locks = getRomanizedFieldLocks(metadata)
  const suggestions: RomanizationFieldSuggestion[] = []
  const beatmapSetId = match.beatmapSetId

  const current = {
    artistUnicode: metadata.artistUnicode.trim(),
    artist: metadata.artist.trim(),
    titleUnicode: metadata.titleUnicode.trim(),
    title: metadata.title.trim()
  }

  const ranked = {
    artistUnicode: (match.artistUnicode || match.artist).trim(),
    artist: match.artist.trim(),
    titleUnicode: (match.titleUnicode || match.title).trim(),
    title: match.title.trim()
  }

  if (
    !locks.artist &&
    ranked.artist &&
    !current.artist &&
    !valuesMatch(current.artistUnicode, ranked.artist)
  ) {
    pushSuggestion(suggestions, {
      field: 'artist',
      value: ranked.artist,
      beatmapSetId,
      kind: 'fill'
    })
  }

  if (
    !locks.title &&
    ranked.title &&
    !current.title &&
    !valuesMatch(current.titleUnicode, ranked.title)
  ) {
    pushSuggestion(suggestions, {
      field: 'title',
      value: ranked.title,
      beatmapSetId,
      kind: 'fill'
    })
  }

  if (
    hasDistinctUnicodePair(ranked.artistUnicode, ranked.artist) &&
    !current.artistUnicode &&
    !valuesMatch(current.artist, ranked.artistUnicode)
  ) {
    pushSuggestion(suggestions, {
      field: 'artistUnicode',
      value: ranked.artistUnicode,
      beatmapSetId,
      kind: 'fill'
    })
  }

  if (
    hasDistinctUnicodePair(ranked.titleUnicode, ranked.title) &&
    !current.titleUnicode &&
    !valuesMatch(current.title, ranked.titleUnicode)
  ) {
    pushSuggestion(suggestions, {
      field: 'titleUnicode',
      value: ranked.titleUnicode,
      beatmapSetId,
      kind: 'fill'
    })
  }

  maybeSuggestCasingFix(
    suggestions,
    'artistUnicode',
    current.artistUnicode,
    ranked.artistUnicode,
    beatmapSetId
  )
  maybeSuggestCasingFix(
    suggestions,
    'artist',
    current.artist,
    ranked.artist,
    beatmapSetId,
    !locks.artist
  )
  maybeSuggestCasingFix(
    suggestions,
    'titleUnicode',
    current.titleUnicode,
    ranked.titleUnicode,
    beatmapSetId
  )
  maybeSuggestCasingFix(
    suggestions,
    'title',
    current.title,
    ranked.title,
    beatmapSetId,
    !locks.title
  )

  return suggestions
}
