import {
  applyRomanizedFieldLocks,
  getRomanizedFieldLocks
} from '../shared/romanization'
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

  const locks = getRomanizedFieldLocks(primary)
  const metadata = applyRomanizedFieldLocks(primary, locks)

  return {
    metadata,
    mismatched,
    diffCount: osuFiles.length,
    lockArtistRomanized: locks.artist,
    lockTitleRomanized: locks.title
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

  const locks = getRomanizedFieldLocks(metadata)
  const normalized = applyRomanizedFieldLocks(metadata, locks)

  for (const filePath of osuFiles) {
    updateMetadataInFile(filePath, normalized)
  }

  return { updatedFiles: osuFiles.length }
}
