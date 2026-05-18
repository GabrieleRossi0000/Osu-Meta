import { existsSync, readdirSync, statSync } from 'fs'
import { join } from 'path'
import { deduplicateBeatmapSets, type DedupCandidate } from './beatmap-dedup'
import { resolveBackgroundFromSet, toBeatmapBgUrl } from './background-image'
import { readBeatmapSetIdFromFile, readMetadataFromFile } from './osu-file'
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

function getFolderLastModifiedMs(folderPath: string, osuFiles: string[]): number {
  let latest = 0

  try {
    latest = Math.max(latest, statSync(folderPath).mtimeMs)
  } catch {
    // ignore
  }

  for (const osuFile of osuFiles) {
    try {
      latest = Math.max(latest, statSync(osuFile).mtimeMs)
    } catch {
      // ignore
    }
  }

  return latest
}

function hasBeatmapSetIdPrefix(folderName: string, beatmapSetId: number): boolean {
  if (beatmapSetId <= 0) return false
  return folderName.startsWith(`${beatmapSetId} `)
}

export function scanBeatmapSets(songsPath: string): BeatmapSetSummary[] {
  if (!existsSync(songsPath)) {
    return []
  }

  const entries = readdirSync(songsPath, { withFileTypes: true })
  const candidates: DedupCandidate[] = []

  for (const entry of entries) {
    if (!entry.isDirectory()) continue

    const folderPath = join(songsPath, entry.name)
    const osuFiles = listOsuFiles(folderPath)
    if (osuFiles.length === 0) continue

    const primaryOsu = osuFiles[0]
    const beatmapSetId = readBeatmapSetIdFromFile(primaryOsu)
    const backgroundPath = resolveBackgroundFromSet(folderPath, osuFiles)

    candidates.push({
      folderPath,
      folderName: entry.name,
      displayName: buildDisplayName(entry.name, primaryOsu),
      diffCount: osuFiles.length,
      backgroundImageUrl: backgroundPath ? toBeatmapBgUrl(backgroundPath) : null,
      beatmapSetId,
      lastModifiedMs: getFolderLastModifiedMs(folderPath, osuFiles),
      hasIdPrefix: hasBeatmapSetIdPrefix(entry.name, beatmapSetId)
    })
  }

  return deduplicateBeatmapSets(candidates).sort((a, b) =>
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
