import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { shell } from 'electron'

const execFileAsync = promisify(execFile)

export async function openExternalUrl(rawUrl: string): Promise<void> {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    throw new Error('Invalid URL.')
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Only http(s) links can be opened in a browser.')
  }

  const href = url.href

  try {
    await shell.openExternal(href)
    return
  } catch (error) {
    if (process.platform !== 'win32') {
      throw error instanceof Error ? error : new Error('Could not open your default browser.')
    }
  }

  // Windows fallback when ShellExecute does not launch the browser (seen on some setups).
  await execFileAsync('cmd.exe', ['/d', '/c', 'start', '', href], { windowsHide: true })
}
