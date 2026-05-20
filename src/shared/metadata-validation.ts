import { isAlreadyRomanized } from './romanization'
import type { BeatmapMetadata } from './types'

export type ValidationSeverity = 'warning' | 'error'

export interface MetadataValidationIssue {
  id: string
  message: string
  severity: ValidationSeverity
}

export function getMetadataValidationIssues(
  metadata: BeatmapMetadata,
  options: { mismatched: boolean; comboColoursMismatched?: boolean }
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

  if (metadata.artistUnicode.trim() && !isAlreadyRomanized(metadata.artistUnicode)) {
    if (!metadata.artist.trim()) {
      issues.push({
        id: 'artist-romanized-empty',
        message: 'Romanized artist name is empty but artist name uses non-Latin characters.',
        severity: 'warning'
      })
    }
  }

  if (metadata.titleUnicode.trim() && !isAlreadyRomanized(metadata.titleUnicode)) {
    if (!metadata.title.trim()) {
      issues.push({
        id: 'title-romanized-empty',
        message: 'Romanized song title is empty but song title uses non-Latin characters.',
        severity: 'warning'
      })
    }
  }

  return issues
}
