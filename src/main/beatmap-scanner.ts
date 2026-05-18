import { existsSync, readdirSync, statSync } from 'fs'
import { join } from 'path'
import { readMetadataFromFile } from './osu-file'
import type { BeatmapSetSummary } from '../shared/types'

function listOsuFiles(folderPath: string): string[] {
  try {
    return readdirSync(folderPath)
      .filter((name) => name.toLowerCase().endsWith('.osu'))
      .map((name) => join(folderPath, name))
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
  } catch {
    return []
  }
}

function buildDisplayName(folderName: string, osuPath: string | undefined): string {
  if (!osuPath) return folderName

  try {
    const meta = readMetadataFromFile(osuPath)
    const primary =
      meta.artistUnicode && meta.titleUnicode
        ? `${meta.artistUnicode} - ${meta.titleUnicode}`
        : meta.artist && meta.title
          ? `${meta.artist} - ${meta.title}`
          : ''
    return primary || folderName
  } catch {
    return folderName
  }
}

export function scanBeatmapSets(songsPath: string): BeatmapSetSummary[] {
  if (!existsSync(songsPath)) {
    return []
  }

  const entries = readdirSync(songsPath, { withFileTypes: true })
  const sets: BeatmapSetSummary[] = []

  for (const entry of entries) {
    if (!entry.isDirectory()) continue

    const folderPath = join(songsPath, entry.name)
    const osuFiles = listOsuFiles(folderPath)
    if (osuFiles.length === 0) continue

    sets.push({
      folderPath,
      folderName: entry.name,
      displayName: buildDisplayName(entry.name, osuFiles[0]),
      diffCount: osuFiles.length
    })
  }

  return sets.sort((a, b) =>
    a.displayName.localeCompare(b.displayName, undefined, { sensitivity: 'base' })
  )
}

export function getOsuFilesInSet(folderPath: string): string[] {
  return listOsuFiles(folderPath)
}

export function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory()
  } catch {
    return false
  }
}
