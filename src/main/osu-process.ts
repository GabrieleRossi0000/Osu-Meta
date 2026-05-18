import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

const OSU_RUNNING_CACHE_MS = 2500
let osuRunningCache: { value: boolean; at: number } | null = null

async function probeOsuProcessRunning(): Promise<boolean> {
  if (process.platform === 'win32') {
    try {
      const { stdout } = await execFileAsync(
        'powershell.exe',
        [
          '-NoProfile',
          '-Command',
          '(Get-Process -Name osu -ErrorAction SilentlyContinue | Measure-Object).Count'
        ],
        { timeout: 5000 }
      )
      return Number.parseInt(stdout.trim(), 10) > 0
    } catch {
      return false
    }
  }

  try {
    const { stdout } = await execFileAsync('pgrep', ['-x', 'osu'], { timeout: 5000 })
    return stdout.trim().length > 0
  } catch {
    return false
  }
}

export async function isOsuProcessRunning(): Promise<boolean> {
  const now = Date.now()
  if (osuRunningCache && now - osuRunningCache.at < OSU_RUNNING_CACHE_MS) {
    return osuRunningCache.value
  }

  const value = await probeOsuProcessRunning()
  osuRunningCache = { value, at: now }
  return value
}

/** Call after save / fetch-current so the next poll is fresh */
export function invalidateOsuRunningCache(): void {
  osuRunningCache = null
}
