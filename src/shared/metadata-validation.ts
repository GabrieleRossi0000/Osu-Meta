import { isAlreadyRomanized } from './romanization'
import { getFullMetadataInTagsViolations } from './tags'
import type { BeatmapMetadata } from './types'

export type ValidationSeverity = 'warning' | 'error'

export interface MetadataValidationIssue {
  id: string
  message: string
  severity: ValidationSeverity
}

const FULL_METADATA_IN_TAGS_MESSAGES = {
  artist: 'Artist cannot appear in tags.',
  title: 'Title cannot appear in tags.',
  source: 'Source cannot appear in tags.'
} as const

export function getMetadataValidationIssues(
  metadata: BeatmapMetadata,
  options: {
    mismatched: boolean
    comboColoursMismatched?: boolean
    /** When true, ranked romanization lookup is still in progress — defer empty-romanized warnings. */
    romanizationLookupPending?: boolean
    /** When true, a ranked-map pill can fill the empty romanized artist field. */
    romanizationSuggestionForArtist?: boolean
    /** When true, a ranked-map pill can fill the empty romanized title field. */
    romanizationSuggestionForTitle?: boolean
  }
): MetadataValidationIssue[] {
  const issues: MetadataValidationIssue[] = []

  if (options.mismatched) {
    issues.push({
      id: 'mismatched',
      message: 'Difficulties in this set have different metadata values.',
      severity: 'warning'
    })
  }

  if (options.comboColoursMismatched) {
    issues.push({
      id: 'combo-colours-mismatched',
      message: 'Difficulties in this set have different combo colours in [Colours].',
      severity: 'warning'
    })
  }

  for (const violation of getFullMetadataInTagsViolations(
    metadata.tags,
    metadata.artistUnicode,
    metadata.artist,
    metadata.titleUnicode,
    metadata.title,
    metadata.source
  )) {
    issues.push({
      id: `tags-contains-${violation.field}`,
      message: FULL_METADATA_IN_TAGS_MESSAGES[violation.field],
      severity: 'error'
    })
  }

  if (metadata.artistUnicode.trim() && !isAlreadyRomanized(metadata.artistUnicode)) {
    if (
      !metadata.artist.trim() &&
      !options.romanizationLookupPending &&
      !options.romanizationSuggestionForArtist
    ) {
      issues.push({
        id: 'artist-romanized-empty',
        message: 'Romanized artist name is empty but artist name uses non-Latin characters.',
        severity: 'warning'
      })
    }
  }

  if (metadata.titleUnicode.trim() && !isAlreadyRomanized(metadata.titleUnicode)) {
    if (
      !metadata.title.trim() &&
      !options.romanizationLookupPending &&
      !options.romanizationSuggestionForTitle
    ) {
      issues.push({
        id: 'title-romanized-empty',
        message: 'Romanized song title is empty but song title uses non-Latin characters.',
        severity: 'warning'
      })
    }
  }

  return issues
}
