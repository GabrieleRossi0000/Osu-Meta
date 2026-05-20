import { metadataFieldLabel } from './metadata-utils'
import type { SaveMetadataResult } from './types'

export function formatSaveSuccessMessage(result: SaveMetadataResult): string {
  if (result.updatedFiles === 0) {
    return 'No changes to save.'
  }

  const parts: string[] = []
  if (result.updatedMetadataFields.length > 0) {
    parts.push(
      result.updatedMetadataFields.map((field) => metadataFieldLabel(field)).join(', ')
    )
  }
  if (result.updatedComboColours) {
    parts.push('combo colours')
  }

  const what = parts.length > 0 ? parts.join(' and ') : 'metadata'
  return `Saved ${what}.`
}
