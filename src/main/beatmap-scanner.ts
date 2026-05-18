import { existsSync, readdirSync, statSync } from 'fs'
import { join } from 'path'
import { deduplicateBeatmapSets, type DedupCandidate } from './beatmap-dedup'
import { resolveBackgroundFromSet, toBeatmapBgUrl } from './background-image'
import { readBeatmapSetIdFromFile, readMetadataFromFile } from './osu-file'
import { computeSetFlags } from './set-flags'
import { getScanCache, setScanCache } from './settings'
import type { BeatmapSetSummary, ScanCache } from '../shared/types'

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

function scanSingleFolder(songsPath: string, folderName: string): DedupCandidate | null {
  const folderPath = join(songsPath, folderName)
  const osuFiles = listOsuFiles(folderPath)
  if (osuFiles.length === 0) return null

  const primaryOsu = osuFiles[0]
  const beatmapSetId = readBeatmapSetIdFromFile(primaryOsu)
  const backgroundPath = resolveBackgroundFromSet(folderPath, osuFiles)
  const lastModifiedMs = getFolderLastModifiedMs(folderPath, osuFiles)

  return {
    folderPath,
    folderName,
    displayName: buildDisplayName(folderName, primaryOsu),
    diffCount: osuFiles.length,
    backgroundImageUrl: backgroundPath ? toBeatmapBgUrl(backgroundPath) : null,
    beatmapSetId,
    lastModifiedMs,
    hasIdPrefix: hasBeatmapSetIdPrefix(folderName, beatmapSetId),
    flags: computeSetFlags(osuFiles)
  }
}

function toSummary(candidate: DedupCandidate, hiddenDuplicateCount: number): BeatmapSetSummary {
  return {
    folderPath: candidate.folderPath,
    folderName: candidate.folderName,
    displayName: candidate.displayName,
    diffCount: candidate.diffCount,
    backgroundImageUrl: candidate.backgroundImageUrl,
    beatmapSetId: candidate.beatmapSetId > 0 ? candidate.beatmapSetId : null,
    lastModifiedAt: candidate.lastModifiedMs,
    hiddenDuplicateCount,
    flags: candidate.flags
  }
}

export function scanBeatmapSets(songsPath: string, force = false): BeatmapSetSummary[] {
  if (!existsSync(songsPath)) {
    setScanCache(null)
    return []
  }

  const entries = readdirSync(songsPath, { withFileTypes: true })
  const folderNames = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name)

  const cache = getScanCache()
  const useCache = !force && cache?.songsPath === songsPath
  const nextCache: ScanCache = { songsPath, entries: {} }
  const candidates: DedupCandidate[] = []

  for (const folderName of folderNames) {
    const folderPath = join(songsPath, folderName)
    const osuFiles = listOsuFiles(folderPath)
    if (osuFiles.length === 0) continue

    const lastModifiedMs = getFolderLastModifiedMs(folderPath, osuFiles)
    const cached = useCache ? cache.entries[folderPath] : undefined

    if (cached && cached.lastModifiedMs >= lastModifiedMs) {
      nextCache.entries[folderPath] = cached
      candidates.push({
        folderPath: cached.summary.folderPath,
        folderName: cached.summary.folderName,
        displayName: cached.summary.displayName,
        diffCount: cached.summary.diffCount,
        backgroundImageUrl: cached.summary.backgroundImageUrl,
        beatmapSetId: cached.summary.beatmapSetId ?? 0,
        lastModifiedMs: cached.summary.lastModifiedAt,
        hasIdPrefix: hasBeatmapSetIdPrefix(
          cached.summary.folderName,
          cached.summary.beatmapSetId ?? 0
        ),
        flags: cached.summary.flags
      })
      continue
    }

    const scanned = scanSingleFolder(songsPath, folderName)
    if (!scanned) continue

    const hiddenDuplicateCount = 0
    const summary = toSummary(scanned, hiddenDuplicateCount)
    nextCache.entries[folderPath] = { lastModifiedMs, summary }
    candidates.push(scanned)
  }

  const results = deduplicateBeatmapSets(candidates).sort((a, b) =>
    a.displayName.localeCompare(b.displayName, undefined, { sensitivity: 'base' })
  )

  const summaryByPath = new Map(results.map((set) => [set.folderPath, set]))
  for (const [folderPath, entry] of Object.entries(nextCache.entries)) {
    const updated = summaryByPath.get(folderPath)
    if (updated) {
      entry.summary = updated
    }
  }

  setScanCache(nextCache)
  return results
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
