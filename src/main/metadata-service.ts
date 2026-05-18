import type { BeatmapMetadata, LoadedMetadata, SaveMetadataResult } from '../shared/types'
import { getOsuFilesInSet } from './beatmap-scanner'
import {
  metadataEquals,
  readMetadataFromFile,
  updateMetadataInFile
} from './osu-file'

export function loadSetMetadata(folderPath: string): LoadedMetadata {
  const osuFiles = getOsuFilesInSet(folderPath)
  if (osuFiles.length === 0) {
    throw new Error('No .osu files found in this beatmap folder.')
  }

  const primary = readMetadataFromFile(osuFiles[0])
  let mismatched = false

  for (let i = 1; i < osuFiles.length; i++) {
    const other = readMetadataFromFile(osuFiles[i])
    if (!metadataEquals(primary, other)) {
      mismatched = true
      break
    }
  }

  return {
    metadata: primary,
    mismatched,
    diffCount: osuFiles.length
  }
}

export function saveSetMetadata(
  folderPath: string,
  metadata: BeatmapMetadata
): SaveMetadataResult {
  const osuFiles = getOsuFilesInSet(folderPath)
  if (osuFiles.length === 0) {
    throw new Error('No .osu files found in this beatmap folder.')
  }

  for (const filePath of osuFiles) {
    updateMetadataInFile(filePath, metadata)
  }

  return { updatedFiles: osuFiles.length }
}
