import { app, BrowserWindow, dialog } from 'electron'
import { autoUpdater } from 'electron-updater'
import log from 'electron-log'

let downloadRequested = false

function getWindow(): BrowserWindow | null {
  const win = BrowserWindow.getAllWindows()[0]
  return win && !win.isDestroyed() ? win : null
}

export function initAutoUpdater(): void {
  if (!app.isPackaged) return

  log.transports.file.level = 'info'
  autoUpdater.logger = log
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.allowPrerelease = false

  autoUpdater.on('error', (error) => {
    log.error('[updater]', error)
    downloadRequested = false
  })

  autoUpdater.on('update-available', async (info) => {
    if (downloadRequested) return

    const win = getWindow()
    const { response } = await dialog.showMessageBox({
      ...(win ? { browserWindow: win } : {}),
      type: 'info',
      title: 'Update available',
      message: `Osu Meta ${info.version} is available.`,
      detail:
        'Download and install now? The app will restart when finished. Your existing install will be updated in place.',
      buttons: ['Update now', 'Later'],
      defaultId: 0,
      cancelId: 1,
      noLink: true
    })

    if (response !== 0) return

    downloadRequested = true
    try {
      await autoUpdater.downloadUpdate()
    } catch (error) {
      downloadRequested = false
      log.error('[updater] download failed', error)
      await dialog.showMessageBox({
        ...(win ? { browserWindow: win } : {}),
        type: 'error',
        title: 'Update failed',
        message: 'Could not download the update.',
        detail: error instanceof Error ? error.message : String(error),
        buttons: ['OK']
      })
    }
  })

  autoUpdater.on('update-not-available', () => {
    getWindow()?.webContents.send('updater:up-to-date')
  })

  autoUpdater.on('update-downloaded', () => {
    setTimeout(() => {
      autoUpdater.quitAndInstall(false, true)
    }, 400)
  })

  setTimeout(() => {
    void autoUpdater.checkForUpdates().catch((error) => {
      log.warn('[updater] check failed', error)
    })
  }, 2500)
}
