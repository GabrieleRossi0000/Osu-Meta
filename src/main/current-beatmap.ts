import { execFile } from 'child_process'
import { existsSync, readdirSync, statSync } from 'fs'
import { join, dirname, normalize } from 'path'
import { promisify } from 'util'
import type { BeatmapSetSummary, CurrentBeatmapLookupResult } from '../shared/types'
import { matchBeatmapByDisplayTitle, matchBeatmapBySetId } from '../shared/match-display-name'
import { readStableBeatmapFromMemory, type StableMemoryBeatmap } from './stable-beatmap-memory'

const execFileAsync = promisify(execFile)

const OSU_EDITOR_TITLE = /^\s*osu!\s*-\s*(?<metadata>.+?\.osu)\s*$/i
const OSU_DISPLAY_TITLE = /^\s*osu!\s*-\s*(?<title>.+?)\s*$/i
const ANY_OSU_FILENAME = /(?<metadata>[^\\/:*?"<>|\r\n]+?\.osu)/gi

const stickyMetadataByMode = new Map<'stable' | 'lazer', string>()

function normalizeLookupName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
}

function extractEditorMetadata(windowTitle: string): string | null {
  const trimmed = windowTitle.trim()
  if (!trimmed) return null

  const strict = OSU_EDITOR_TITLE.exec(trimmed)
  if (strict?.groups?.metadata) return strict.groups.metadata.trim()

  const matches = [...trimmed.matchAll(ANY_OSU_FILENAME)]
  if (matches.length === 0) return null
  const loose = matches[matches.length - 1].groups?.metadata?.trim()
  return loose || null
}

function extractSongSelectDisplayTitle(windowTitle: string): string | null {
  const trimmed = windowTitle.trim()
  if (!trimmed) return null
  if (extractEditorMetadata(trimmed)) return null

  const match = OSU_DISPLAY_TITLE.exec(trimmed)
  const title = match?.groups?.title?.trim()
  if (!title || title.length < 2) return null
  return title
}

function resolveStickyMetadata(mode: 'stable' | 'lazer', live: string | null): string | null {
  if (live) {
    const prev = stickyMetadataByMode.get(mode)
    if (!prev || normalizeLookupName(prev) !== normalizeLookupName(live)) {
      stickyMetadataByMode.set(mode, live)
    }
  }
  return stickyMetadataByMode.get(mode) ?? null
}

function isLazerSongsPath(songsFolder: string): boolean {
  const n = songsFolder.replace(/\//g, '\\').toLowerCase()
  return n.includes('\\storage\\files\\')
}

function findStableBeatmapFolder(songsFolder: string, metadataFilename: string): string | null {
  if (!existsSync(songsFolder)) return null

  const matches: string[] = []
  try {
    for (const entry of readdirSync(songsFolder, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      const candidate = join(songsFolder, entry.name, metadataFilename)
      if (existsSync(candidate)) matches.push(candidate)
    }
  } catch {
    return null
  }

  if (matches.length === 0) return null
  matches.sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)
  return dirname(matches[0])
}

function getLazerTempRoots(): string[] {
  const roots = new Set<string>()
  const localAppData = process.env.LOCALAPPDATA
  if (localAppData) {
    for (const sub of ['Temp', join('osu!', 'Temp')]) {
      const p = join(localAppData, sub)
      if (existsSync(p)) roots.add(p)
    }
  }
  const systemTemp = process.env.TEMP || process.env.TMP
  if (systemTemp && existsSync(systemTemp)) roots.add(systemTemp)
  return [...roots]
}

function findLazerBeatmapFolder(metadataFilename: string): string | null {
  for (const root of getLazerTempRoots()) {
    try {
      const found = findOsuFileByName(root, metadataFilename, 4)
      if (found) return dirname(found)
    } catch {
      // continue
    }
  }
  return null
}

function findOsuFileByName(
  dir: string,
  fileName: string,
  maxDepth: number
): string | null {
  if (maxDepth < 0 || !existsSync(dir)) return null

  let entries: { name: string; isDirectory: () => boolean; isFile: () => boolean }[]
  try {
    entries = readdirSync(dir, { withFileTypes: true }) as typeof entries
  } catch {
    return null
  }

  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isFile() && entry.name.localeCompare(fileName, undefined, { sensitivity: 'base' }) === 0) {
      return full
    }
  }

  if (maxDepth === 0) return null

  const dirs = entries
    .filter((e) => e.isDirectory())
    .sort((a, b) => {
      try {
        return statSync(join(dir, b.name)).mtimeMs - statSync(join(dir, a.name)).mtimeMs
      } catch {
        return 0
      }
    })
    .slice(0, 40)

  for (const sub of dirs) {
    const hit = findOsuFileByName(join(dir, sub.name), fileName, maxDepth - 1)
    if (hit) return hit
  }

  return null
}

async function listOsuWindowTitles(): Promise<string[]> {
  if (process.platform !== 'win32') return []

  const ps = `
$ErrorActionPreference = 'SilentlyContinue'
Add-Type @"
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text;
public static class OsuWin {
  public delegate bool EnumProc(IntPtr hWnd, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc lpEnumFunc, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern int GetWindowTextLength(IntPtr hWnd);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
}
"@
$osuPids = @(Get-Process | Where-Object { $_.ProcessName -like '*osu*' } | ForEach-Object { $_.Id })
$list = New-Object System.Collections.Generic.List[string]
$proc = [OsuWin+EnumProc]{
  param($hWnd, $lParam)
  if (-not [OsuWin]::IsWindowVisible($hWnd)) { return $true }
  [uint32]$wpid = 0
  [void][OsuWin]::GetWindowThreadProcessId($hWnd, [ref]$wpid)
  if ($osuPids -notcontains [int]$wpid) { return $true }
  $len = [OsuWin]::GetWindowTextLength($hWnd)
  if ($len -le 0) { return $true }
  $sb = New-Object System.Text.StringBuilder ($len + 1)
  [void][OsuWin]::GetWindowText($hWnd, $sb, $sb.Capacity)
  $t = $sb.ToString()
  if ($t.Length -gt 0) { $list.Add($t) | Out-Null }
  return $true
}
[void][OsuWin]::EnumWindows($proc, [IntPtr]::Zero)
foreach ($p in Get-Process | Where-Object { $_.ProcessName -like '*osu*' }) {
  if ($p.MainWindowTitle) { $list.Add($p.MainWindowTitle) | Out-Null }
}
$list | Select-Object -Unique | ConvertTo-Json -Compress
`

  const { stdout } = await execFileAsync(
    'powershell.exe',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', ps],
    { timeout: 15000, maxBuffer: 2 * 1024 * 1024 }
  )

  const raw = stdout.trim()
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as string | string[]
    return Array.isArray(parsed) ? parsed : [parsed]
  } catch {
    return []
  }
}

function collectMetadataCandidates(titles: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const title of titles) {
    const meta = extractEditorMetadata(title)
    if (!meta) continue
    const key = meta.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(meta)
  }
  return out
}

function collectDisplayTitleCandidates(titles: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const title of titles) {
    const display = extractSongSelectDisplayTitle(title)
    if (!display) continue
    const key = display.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(display)
  }
  return out
}

function folderFoundResult(
  message: string,
  metadataFilename: string | null,
  folderPath: string,
  displayTitle: string | null = null
): CurrentBeatmapLookupResult {
  return {
    status: 'folder_found',
    message,
    metadataFilename,
    displayTitle,
    folderPath: normalize(folderPath)
  }
}

function resolveFolderFromMemory(
  songsFolder: string,
  mode: 'stable' | 'lazer',
  memory: StableMemoryBeatmap
): CurrentBeatmapLookupResult | null {
  if (memory.folderPath && existsSync(memory.folderPath)) {
    stickyMetadataByMode.set(mode, memory.filename)
    return folderFoundResult(
      'Current map found from osu! (editor or song select).',
      memory.filename,
      memory.folderPath,
      memory.mapString
    )
  }

  const folder =
    mode === 'lazer'
      ? findLazerBeatmapFolder(memory.filename) ??
        findStableBeatmapFolder(songsFolder, memory.filename)
      : findStableBeatmapFolder(songsFolder, memory.filename)

  if (folder) {
    stickyMetadataByMode.set(mode, memory.filename)
    return folderFoundResult(
      'Current map found from osu! (editor or song select).',
      memory.filename,
      folder,
      memory.mapString
    )
  }

  return null
}

function lookupInLibrary(
  beatmaps: BeatmapSetSummary[] | undefined,
  memory: StableMemoryBeatmap
): CurrentBeatmapLookupResult | null {
  if (!beatmaps?.length) return null

  if (memory.setId != null) {
    const bySetId = matchBeatmapBySetId(beatmaps, memory.setId)
    if (bySetId) {
      return folderFoundResult(
        'Current map matched by BeatmapSetID from osu! memory.',
        memory.filename,
        bySetId.folderPath,
        memory.mapString
      )
    }
  }

  if (memory.mapString) {
    const byTitle = matchBeatmapByDisplayTitle(beatmaps, memory.mapString)
    if (byTitle) {
      return folderFoundResult(
        'Current map matched from osu! song select memory.',
        memory.filename,
        byTitle.folderPath,
        memory.mapString
      )
    }
  }

  return null
}

export async function lookupCurrentBeatmap(
  songsFolder: string,
  beatmaps?: BeatmapSetSummary[]
): Promise<CurrentBeatmapLookupResult> {
  if (process.platform !== 'win32') {
    return {
      status: 'unsupported_platform',
      message: 'Current map lookup is only supported on Windows.',
      metadataFilename: null,
      displayTitle: null,
      folderPath: null
    }
  }

  if (!songsFolder || !existsSync(songsFolder)) {
    return {
      status: 'songs_folder_not_found',
      message: 'Songs folder could not be found.',
      metadataFilename: null,
      displayTitle: null,
      folderPath: null
    }
  }

  const mode = isLazerSongsPath(songsFolder) ? 'lazer' : 'stable'

  if (mode === 'stable') {
    const fromMemory = await readStableBeatmapFromMemory(songsFolder)
    if (fromMemory) {
      const inLibrary = lookupInLibrary(beatmaps, fromMemory)
      if (inLibrary) return inLibrary

      const onDisk = resolveFolderFromMemory(songsFolder, mode, fromMemory)
      if (onDisk) return onDisk

      if (fromMemory.mapString) {
        return {
          status: 'display_title_found',
          message: 'Current map identified from osu! (song select or editor).',
          metadataFilename: fromMemory.filename,
          displayTitle: fromMemory.mapString,
          folderPath: null
        }
      }
    }
  }

  const titles = await listOsuWindowTitles()
  if (titles.length === 0) {
    const processesRunning = await execFileAsync(
      'powershell.exe',
      [
        '-NoProfile',
        '-Command',
        "(Get-Process | Where-Object { $_.ProcessName -like '*osu*' }).Count"
      ],
      { timeout: 5000 }
    ).catch(() => ({ stdout: '0' }))

    if (Number.parseInt(processesRunning.stdout.trim(), 10) === 0) {
      return {
        status: 'no_process',
        message: 'Could not detect an osu! process. Open osu! and select a map in song select or the editor.',
        metadataFilename: null,
        displayTitle: null,
        folderPath: null
      }
    }
  }

  const candidates = collectMetadataCandidates(titles)
  const displayCandidates = collectDisplayTitleCandidates(titles)
  const live = candidates[0] ?? null
  const sticky = resolveStickyMetadata(mode, live)

  const searchList = candidates.length > 0 ? candidates : sticky ? [sticky] : []

  for (const meta of searchList) {
    const folder =
      mode === 'lazer'
        ? findLazerBeatmapFolder(meta) ?? findStableBeatmapFolder(songsFolder, meta)
        : findStableBeatmapFolder(songsFolder, meta)

    if (folder) {
      return folderFoundResult('Current map found from osu! editor window.', meta, folder)
    }
  }

  if (sticky) {
    const stickyFolder =
      mode === 'lazer'
        ? findLazerBeatmapFolder(sticky) ?? findStableBeatmapFolder(songsFolder, sticky)
        : findStableBeatmapFolder(songsFolder, sticky)

    if (stickyFolder) {
      return folderFoundResult(
        'Current map found from last detected editor title.',
        sticky,
        stickyFolder
      )
    }
  }

  const displayTitle = displayCandidates[0] ?? null
  if (displayTitle) {
    if (beatmaps?.length) {
      const byTitle = matchBeatmapByDisplayTitle(beatmaps, displayTitle)
      if (byTitle) {
        return folderFoundResult(
          'Current map matched from osu! song select window title.',
          null,
          byTitle.folderPath,
          displayTitle
        )
      }
    }

    return {
      status: 'display_title_found',
      message: 'Current map identified from osu! song select window title.',
      metadataFilename: null,
      displayTitle,
      folderPath: null
    }
  }

  if (!sticky && searchList.length === 0) {
    return {
      status: 'no_editor_title',
      message:
        'Could not detect the current map. In song select, highlight a map and try again, or open it in the editor.',
      metadataFilename: null,
      displayTitle: null,
      folderPath: null
    }
  }

  return {
    status: 'metadata_detected',
    message: live
      ? `Detected "${sticky}" but could not find that file in your Songs folder yet.`
      : `Using last detected map "${sticky}". Highlight it in song select or open it in the editor to refresh.`,
    metadataFilename: sticky,
    displayTitle: null,
    folderPath: null
  }
}
