import { app, BrowserWindow, dialog, shell } from 'electron'
import { mkdir, writeFile } from 'fs/promises'
import { dirname, join } from 'path'
import { spawn } from 'child_process'
import log from 'electron-log'

const GITHUB_OWNER = 'GabrieleRossi0000'
const GITHUB_REPO = 'Osu-Meta'
const SETUP_ASSET_RE = /^OsuMeta-[\d.]+-setup\.exe$/i

let checkInFlight = false

function getWindow(): BrowserWindow | null {
  const win = BrowserWindow.getAllWindows()[0]
  return win && !win.isDestroyed() ? win : null
}

function parseReleaseVersion(tagName: string): string {
  return tagName.trim().replace(/^v/i, '')
}

function compareSemver(current: string, latest: string): number {
  const toParts = (value: string): number[] =>
    value.split('.').map((part) => {
      const n = Number.parseInt(part, 10)
      return Number.isFinite(n) ? n : 0
    })

  const a = toParts(current)
  const b = toParts(latest)
  const len = Math.max(a.length, b.length)

  for (let i = 0; i < len; i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0)
    if (diff !== 0) return diff
  }
  return 0
}

interface GithubReleaseAsset {
  name: string
  browser_download_url: string
}

interface GithubRelease {
  tag_name: string
  assets: GithubReleaseAsset[]
}

async function fetchLatestRelease(): Promise<GithubRelease | null> {
  const response = await fetch(
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`,
    {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'OsuMeta'
      }
    }
  )

  if (response.status === 404) return null
  if (!response.ok) {
    throw new Error(`GitHub API returned ${response.status}`)
  }

  return (await response.json()) as GithubRelease
}

function findSetupAsset(release: GithubRelease): GithubReleaseAsset | null {
  return release.assets.find((asset) => SETUP_ASSET_RE.test(asset.name)) ?? null
}

async function downloadSetupInstaller(url: string, destination: string): Promise<void> {
  await mkdir(dirname(destination), { recursive: true })

  const response = await fetch(url, { headers: { 'User-Agent': 'OsuMeta' } })
  if (!response.ok) {
    throw new Error(`Download failed (${response.status})`)
  }

  const buffer = Buffer.from(await response.arrayBuffer())
  await writeFile(destination, buffer)
}

async function runInstaller(installerPath: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(installerPath, ['/S'], {
      detached: true,
      stdio: 'ignore'
    })
    child.on('error', reject)
    child.on('spawn', () => {
      child.unref()
      resolve()
    })
  })
}

async function notifyUpToDate(manual: boolean): Promise<void> {
  getWindow()?.webContents.send('updater:up-to-date')
  if (!manual) return

  const win = getWindow()
  await dialog.showMessageBox({
    ...(win ? { browserWindow: win } : {}),
    type: 'info',
    title: 'No updates',
    message: `You are on the latest version (${app.getVersion()}).`,
    buttons: ['OK']
  })
}

async function promptAndInstallUpdate(latestVersion: string, downloadUrl: string): Promise<void> {
  const win = getWindow()
  const { response } = await dialog.showMessageBox({
    ...(win ? { browserWindow: win } : {}),
    type: 'info',
    title: 'Update available',
    message: `Osu Meta ${latestVersion} is available.`,
    detail:
      'Download and install now? Your existing installation will be updated in place and the app will restart.',
    buttons: ['Update now', 'Later'],
    defaultId: 0,
    cancelId: 1,
    noLink: true
  })

  if (response !== 0) return

  const installerPath = join(app.getPath('temp'), `OsuMeta-${latestVersion}-setup.exe`)

  try {
    await downloadSetupInstaller(downloadUrl, installerPath)
    await runInstaller(installerPath)
    app.quit()
  } catch (error) {
    log.error('[updater] install failed', error)
    const { response: action } = await dialog.showMessageBox({
      ...(win ? { browserWindow: win } : {}),
      type: 'error',
      title: 'Update failed',
      message: 'Could not download or run the installer.',
      detail:
        error instanceof Error
          ? `${error.message}\n\nYou can download the installer manually from GitHub Releases.`
          : String(error),
      buttons: ['Open releases page', 'OK'],
      defaultId: 0
    })
    if (action === 0) {
      void shell.openExternal(`https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`)
    }
  }
}

async function runUpdateCheck(manual: boolean): Promise<void> {
  if (checkInFlight) return
  checkInFlight = true

  try {
    const release = await fetchLatestRelease()
    if (!release) {
      await notifyUpToDate(manual)
      return
    }

    const latestVersion = parseReleaseVersion(release.tag_name)
    const currentVersion = app.getVersion()

    if (compareSemver(currentVersion, latestVersion) >= 0) {
      await notifyUpToDate(manual)
      return
    }

    const setupAsset = findSetupAsset(release)
    if (!setupAsset) {
      throw new Error('Latest release has no Windows setup installer (.exe).')
    }

    await promptAndInstallUpdate(latestVersion, setupAsset.browser_download_url)
  } catch (error) {
    log.warn('[updater] check failed', error)
    if (manual) {
      const win = getWindow()
      await dialog.showMessageBox({
        ...(win ? { browserWindow: win } : {}),
        type: 'warning',
        title: 'Update check failed',
        message: 'Could not check for updates.',
        detail:
          error instanceof Error
            ? `${error.message}\n\nYou can download the latest installer from GitHub Releases.`
            : String(error),
        buttons: ['OK']
      })
    }
  } finally {
    checkInFlight = false
  }
}

export function initAutoUpdater(): void {
  if (!app.isPackaged) return

  log.transports.file.level = 'info'

  setTimeout(() => {
    void runUpdateCheck(false)
  }, 2500)
}

export function checkForUpdatesNow(): Promise<void> {
  if (!app.isPackaged) {
    return Promise.reject(new Error('Updates are only available in the installed app.'))
  }
  return runUpdateCheck(true)
}
