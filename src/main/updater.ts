import { app, shell } from 'electron'
import { mkdir, writeFile } from 'fs/promises'
import { dirname, join } from 'path'
import { spawn } from 'child_process'
import log from 'electron-log'
import type { UpdaterDialogAction } from '../shared/updater-dialog'
import {
  notifyUpdaterInstalling,
  notifyUpdaterUpToDate,
  resolveUpdaterDialog,
  showUpdaterDialog
} from './updater-dialog'

const GITHUB_OWNER = 'leledorf'
const GITHUB_REPO = 'Osu-Meta'
const RELEASES_URL = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`
const SETUP_ASSET_RE = /^OsuMeta-[\d.]+-setup\.exe$/i

let checkInFlight = false

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

async function fetchLatestRelease(): Promise<GithubRelease> {
  const response = await fetch(
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`,
    {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'OsuMeta'
      }
    }
  )

  if (response.status === 404) {
    throw new Error(
      `No releases found for ${GITHUB_OWNER}/${GITHUB_REPO}. Download updates from ${RELEASES_URL}`
    )
  }
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
    const child = spawn(installerPath, ['/S', '--force-run'], {
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

async function yieldToRenderer(): Promise<void> {
  await new Promise<void>((resolve) => setImmediate(resolve))
}

async function handleDialogAction(action: UpdaterDialogAction): Promise<void> {
  if (action === 'open-releases') {
    await shell.openExternal(RELEASES_URL)
  }
}

async function notifyUpToDate(manual: boolean): Promise<void> {
  const currentVersion = app.getVersion()

  if (manual) {
    const action = await showUpdaterDialog({ kind: 'up-to-date', currentVersion })
    await handleDialogAction(action)
    return
  }

  notifyUpdaterUpToDate()
}

async function promptAndInstallUpdate(latestVersion: string, downloadUrl: string): Promise<void> {
  const currentVersion = app.getVersion()
  const action = await showUpdaterDialog({
    kind: 'available',
    latestVersion,
    currentVersion
  })

  if (action === 'later' || action === 'dismiss') return
  if (action === 'open-releases') {
    await shell.openExternal(RELEASES_URL)
    return
  }

  const installerPath = join(app.getPath('temp'), `OsuMeta-${latestVersion}-setup.exe`)

  try {
    notifyUpdaterInstalling({ latestVersion, phase: 'downloading' })
    await yieldToRenderer()
    await downloadSetupInstaller(downloadUrl, installerPath)
    notifyUpdaterInstalling({ latestVersion, phase: 'installing' })
    await yieldToRenderer()
    await runInstaller(installerPath)
    app.quit()
  } catch (error) {
    log.error('[updater] install failed', error)
    const message =
      error instanceof Error
        ? `${error.message}\n\nYou can download the installer manually from GitHub Releases.`
        : String(error)

    const failAction = await showUpdaterDialog({ kind: 'install-failed', message })
    await handleDialogAction(failAction)
  }
}

async function runUpdateCheck(manual: boolean): Promise<void> {
  if (checkInFlight) return
  checkInFlight = true

  try {
    const release = await fetchLatestRelease()

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
      const message =
        error instanceof Error
          ? `${error.message}\n\nYou can download the latest installer from GitHub Releases.`
          : String(error)
      const action = await showUpdaterDialog({ kind: 'check-failed', message })
      await handleDialogAction(action)
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

export { resolveUpdaterDialog }
