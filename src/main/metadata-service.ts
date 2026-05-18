import {
  applyRomanizedFieldLocks,
  getRomanizedFieldLocks
} from '../shared/romanization'
import { metadataEquals } from '../shared/metadata-utils'
import type { BeatmapMetadata, LoadedMetadata, SaveMetadataResult } from '../shared/types'
import { getOsuFilesInSet } from './beatmap-scanner'
import { inspectOsuBeatmapSet } from './beatmap-set-online'
import { resolveBeatmapSetId } from '../shared/beatmap-set-id'
import { basename } from 'path'
import { readDifficultySummaryFromText } from './osu-difficulty'
import {
  readBeatmapSetIdFromContent,
  readMetadataFieldFromContent,
  readMetadataFromContent,
  readOsuFileText,
  readVersionFromContent,
  updateMetadataInFile
} from './osu-file'

export async function loadSetMetadata(folderPath: string): Promise<LoadedMetadata> {
  const osuFiles = getOsuFilesInSet(folderPath)
  if (osuFiles.length === 0) {
    throw new Error('No .osu files found in this beatmap folder.')
  }

  const texts = osuFiles.map((filePath) => readOsuFileText(filePath))
  const metadatas = texts.map((text) => readMetadataFromContent(text))
  const primary = metadatas[0]
  let mismatched = false

  for (let i = 1; i < metadatas.length; i++) {
    if (!metadataEquals(primary, metadatas[i])) {
      mismatched = true
      break
    }
  }

  const locks = getRomanizedFieldLocks(primary)
  const metadata = applyRomanizedFieldLocks(primary, locks)

  const difficultyVersions = texts.map((text) => readVersionFromContent(text))
  const difficulties = texts
    .map((text, index) => readDifficultySummaryFromText(text, basename(osuFiles[index])))
    .sort((a, b) => a.starRating - b.starRating || a.version.localeCompare(b.version))
  const creator = readMetadataFieldFromContent(texts[0], 'Creator')
  const source = readMetadataFieldFromContent(texts[0], 'Source')
  const beatmapSetId = readBeatmapSetIdFromContent(texts[0])
  const resolvedSetId = resolveBeatmapSetId({
    beatmapSetId: beatmapSetId > 0 ? beatmapSetId : null,
    folderName: basename(folderPath)
  })
  const osuInfo =
    resolvedSetId != null
      ? await inspectOsuBeatmapSet(resolvedSetId)
      : { online: false, isFeaturedArtist: false }

  return {
    metadata,
    mismatched,
    diffCount: osuFiles.length,
    lockArtistRomanized: locks.artist,
    lockTitleRomanized: locks.title,
    difficultyVersions,
    difficulties,
    creator,
    source,
    isFeaturedArtist: osuInfo.isFeaturedArtist,
    isOnOsuWebsite: osuInfo.online
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
