import { getMetadataValidationIssues } from './metadata-validation'
import type { BeatmapMetadata } from './types'

/** Lightweight validation for sidebar triage (no ranked-lookup deferrals). */
export function hasScanTimeValidationIssues(
  metadata: BeatmapMetadata,
  mismatchedMetadata: boolean
): boolean {
  return (
    getMetadataValidationIssues(metadata, { mismatched: mismatchedMetadata }).length > 0
  )
}
