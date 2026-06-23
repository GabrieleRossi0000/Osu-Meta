import {
  applyRomanizedFieldLocks,
  getRomanizedFieldLocks
} from '../shared/romanization'
import { comboColoursEqual } from '../shared/combo-colours'
import {
  buildComboColourMismatchDetails,
  buildMetadataMismatchDetails
} from '../shared/metadata-mismatch'
import {
  coerceSaveMetadataPayload,
  getDirtyMetadataFields,
  getMismatchedMetadataFields,
  metadataEquals,
  pickRepresentativeMetadata
} from '../shared/metadata-utils'
import type {
  BeatmapMetadata,
  ImportSourceData,
  LoadedMetadata,
  SaveMetadataPayload,
  SaveMetadataResult
} from '../shared/types'
import { getOsuFilesInSet } from './beatmap-scanner'
import { inspectOsuBeatmapSet } from './beatmap-set-online'
import { downloadBeatmapOsuText } from './osu-beatmap-download'
import { fetchBeatmapsetFromApi, fetchFirstBeatmapIdFromSet, isOsuApiConfigured } from './osu-api-client'
import {
  fetchBeatmapsetFromWebPage,
  webBeatmapsetToMetadata
} from './osu-beatmapset-web'
import {
  beatmapsetSupportsComboColours,
  gameModesFromModeInts
} from '../shared/osu-game-mode'
import { resolveBeatmapSetId } from '../shared/beatmap-set-id'
import { basename } from 'path'
import { readDifficultySummaryFromText } from './osu-difficulty'
import {
  readBeatmapSetIdFromContent,
  readComboColoursFromContent,
  readGenreFromContent,
  readLanguageFromContent,
  readMetadataFieldFromContent,
  readMetadataFromContent,
  readOsuFileText,
  readVersionFromContent,
  updateComboColoursInFile,
  updateMetadataFieldsInFile
} from './osu-file'

export async function loadSetMetadata(folderPath: string): Promise<LoadedMetadata> {
  const osuFiles = getOsuFilesInSet(folderPath)
  if (osuFiles.length === 0) {
    throw new Error('No .osu files found in this beatmap folder.')
  }

  const texts = osuFiles.map((filePath) => readOsuFileText(filePath))
  const metadatas = texts.map((text) => readMetadataFromContent(text))
  const comboLists = texts.map((text) => readComboColoursFromContent(text))
  const representative = pickRepresentativeMetadata(metadatas)
  let mismatched = false

  for (let i = 1; i < metadatas.length; i++) {
    if (!metadataEquals(representative, metadatas[i])) {
      mismatched = true
      break
    }
  }

  const primaryCombo = comboLists[0]
  let comboColoursMismatched = false
  for (let i = 1; i < comboLists.length; i++) {
    if (!comboColoursEqual(primaryCombo, comboLists[i])) {
      comboColoursMismatched = true
      break
    }
  }

  const locks = getRomanizedFieldLocks(representative)
  const metadata = applyRomanizedFieldLocks(representative, locks)

  const difficultyVersions = texts.map((text) => readVersionFromContent(text))
  const perDifficultyMetadata = texts.map((text, index) => ({
    version: readVersionFromContent(text),
    filename: basename(osuFiles[index]),
    metadata: metadatas[index]
  }))
  const perDifficultyCombo = texts.map((text, index) => ({
    version: readVersionFromContent(text),
    filename: basename(osuFiles[index]),
    comboColours: comboLists[index]
  }))
  const difficultyGeneralSettings = texts.map((text, index) => ({
    version: readVersionFromContent(text),
    filename: basename(osuFiles[index]),
    genre: readGenreFromContent(text),
    language: readLanguageFromContent(text)
  }))
  const difficulties = texts
    .map((text, index) => readDifficultySummaryFromText(text, basename(osuFiles[index])))
    .sort((a, b) => a.starRating - b.starRating || a.version.localeCompare(b.version))
  const creator = readMetadataFieldFromContent(texts[0], 'Creator')
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
    mismatchedFields: getMismatchedMetadataFields(metadatas),
    metadataMismatchDetails: buildMetadataMismatchDetails(perDifficultyMetadata),
    comboColours: primaryCombo,
    comboColoursMismatched,
    comboColourMismatchDetails: buildComboColourMismatchDetails(perDifficultyCombo),
    perDifficultyComboColours: perDifficultyCombo,
    difficultyGeneralSettings,
    diffCount: osuFiles.length,
    lockArtistRomanized: locks.artist,
    lockTitleRomanized: locks.title,
    difficultyVersions,
    difficulties,
    creator,
    isFeaturedArtist: osuInfo.isFeaturedArtist,
    isOnOsuWebsite: osuInfo.online
  }
}

async function loadMetadataFromBeatmapSetIdInternal(beatmapSetId: number): Promise<BeatmapMetadata> {
  if (beatmapSetId <= 0) {
    throw new Error('Invalid beatmap set id.')
  }

  const fromWeb = await fetchBeatmapsetFromWebPage(beatmapSetId)
  if (fromWeb) {
    const metadata = webBeatmapsetToMetadata(fromWeb)
    return applyRomanizedFieldLocks(metadata, getRomanizedFieldLocks(metadata))
  }

  if (isOsuApiConfigured()) {
    const fromApi = await fetchBeatmapsetFromApi(beatmapSetId)
    if (fromApi) {
      const metadata: BeatmapMetadata = {
        artist: fromApi.artist,
        artistUnicode: fromApi.artistUnicode ?? fromApi.artist,
        title: fromApi.title,
        titleUnicode: fromApi.titleUnicode ?? fromApi.title,
        source: fromApi.source ?? '',
        tags: fromApi.tags
      }
      return applyRomanizedFieldLocks(metadata, getRomanizedFieldLocks(metadata))
    }
  }

  throw new Error('Could not load metadata from osu!.')
}

export async function loadMetadataFromBeatmapSetId(beatmapSetId: number): Promise<BeatmapMetadata> {
  return loadMetadataFromBeatmapSetIdInternal(beatmapSetId)
}

export async function loadImportSourceFromBeatmapSetId(
  beatmapSetId: number
): Promise<ImportSourceData> {
  const metadata = await loadMetadataFromBeatmapSetIdInternal(beatmapSetId)
  const beatmapId = await fetchFirstBeatmapIdFromSet(beatmapSetId)
  if (beatmapId == null) {
    return { metadata, comboColours: [], gameModes: [] }
  }

  const osuText = await downloadBeatmapOsuText(beatmapId)
  if (!osuText) {
    return { metadata, comboColours: [], gameModes: [] }
  }

  const sourceDiff = readDifficultySummaryFromText(osuText, 'import.osu')

  return {
    metadata,
    comboColours: readComboColoursFromContent(osuText),
    gameModes: gameModesFromModeInts([sourceDiff.mode])
  }
}

export function saveSetMetadata(
  folderPath: string,
  payload: SaveMetadataPayload
): SaveMetadataResult {
  const osuFiles = getOsuFilesInSet(folderPath)
  if (osuFiles.length === 0) {
    throw new Error('No .osu files found in this beatmap folder.')
  }

  const save = coerceSaveMetadataPayload(payload)
  const locks = getRomanizedFieldLocks(save.metadata)
  const normalized = applyRomanizedFieldLocks(save.metadata, locks)
  const dirtyFields = getDirtyMetadataFields(normalized, save.savedMetadata)
  const comboDirty = !comboColoursEqual(save.comboColours, save.savedComboColours)
  const setGameModes = gameModesFromModeInts(
    osuFiles.map((filePath) => readDifficultySummaryFromText(readOsuFileText(filePath), filePath).mode)
  )
  const supportsComboColours = beatmapsetSupportsComboColours(setGameModes)
  const writeComboColours = comboDirty && supportsComboColours

  if (dirtyFields.length === 0 && !writeComboColours) {
    return { updatedFiles: 0, updatedMetadataFields: [], updatedComboColours: false }
  }

  for (const filePath of osuFiles) {
    if (dirtyFields.length > 0) {
      updateMetadataFieldsInFile(filePath, normalized, dirtyFields)
    }
    if (writeComboColours) {
      updateComboColoursInFile(filePath, save.comboColours)
    }
  }

  return {
    updatedFiles: osuFiles.length,
    updatedMetadataFields: dirtyFields,
    updatedComboColours: writeComboColours
  }
}
