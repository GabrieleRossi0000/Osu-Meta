import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

export async function isOsuProcessRunning(): Promise<boolean> {
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
