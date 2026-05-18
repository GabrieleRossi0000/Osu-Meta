import { app } from 'electron'
import { execFile } from 'child_process'
import { existsSync } from 'fs'
import { join, normalize } from 'path'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

export interface StableMemoryBeatmap {
  folder: string
  filename: string
  folderPath: string
  mapString: string | null
  setId: number | null
  mapId: number | null
}

interface StableMemoryResponse {
  ok: boolean
  error?: string
  folder?: string
  filename?: string
  folderPath?: string
  mapString?: string
  setId?: number
  mapId?: number
}

function resolveScriptPath(): string {
  const candidates = [
    join(__dirname, 'scripts', 'read-stable-beatmap.ps1'),
    join(__dirname, '..', 'src', 'main', 'scripts', 'read-stable-beatmap.ps1')
  ]

  if (app.isPackaged && process.resourcesPath) {
    candidates.unshift(join(process.resourcesPath, 'scripts', 'read-stable-beatmap.ps1'))
  }

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate
  }

  throw new Error('read-stable-beatmap.ps1 not found')
}

export async function readStableBeatmapFromMemory(
  songsFolder: string
): Promise<StableMemoryBeatmap | null> {
  if (process.platform !== 'win32') return null

  try {
    const script = resolveScriptPath()
    const { stdout } = await execFileAsync(
      'powershell.exe',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script, '-SongsFolder', songsFolder],
      { timeout: 20000, maxBuffer: 1024 * 1024 }
    )

    const parsed = JSON.parse(stdout.trim()) as StableMemoryResponse
    const mapString = parsed.mapString?.trim() || null
    const setId = typeof parsed.setId === 'number' && parsed.setId > 0 ? parsed.setId : null
    const mapId = typeof parsed.mapId === 'number' && parsed.mapId > 0 ? parsed.mapId : null

    if (!parsed.ok) {
      if (!mapString && setId == null) return null
      return {
        folder: parsed.folder ?? '',
        filename: parsed.filename ?? '',
        folderPath: '',
        mapString,
        setId,
        mapId
      }
    }

    if (!parsed.folder || !parsed.filename) {
      if (!mapString && setId == null) return null
      return {
        folder: parsed.folder ?? '',
        filename: parsed.filename ?? '',
        folderPath: '',
        mapString,
        setId,
        mapId
      }
    }

    const folderPath = parsed.folderPath
      ? normalize(parsed.folderPath)
      : normalize(join(songsFolder, parsed.folder))

    if (!existsSync(folderPath)) return null
    if (!existsSync(join(folderPath, parsed.filename))) return null

    return {
      folder: parsed.folder,
      filename: parsed.filename,
      folderPath,
      mapString,
      setId,
      mapId
    }
  } catch {
    return null
  }
}
