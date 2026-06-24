import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import {
  WINDOW_BAR_HEIGHT,
  WINDOWS_MIN_WINDOW_WIDTH,
  WINDOWS_TITLE_BAR_OVERLAY
} from '../shared/window-chrome'
import { getAppIconPath } from './app-icon'
import { registerIpcHandlers } from './ipc'
import { initAutoUpdater } from './updater'
import { openExternalUrl } from './open-external-url'
import { registerBeatmapProtocol, setupBeatmapProtocolHandler } from './protocol'
import { loadAppEnv } from './load-env'

loadAppEnv()

registerBeatmapProtocol()

function createWindow(): void {
  const icon = getAppIconPath()
  const isWindows = process.platform === 'win32'

  const mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: isWindows ? WINDOWS_MIN_WINDOW_WIDTH : 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    resizable: true,
    title: 'Osu Meta',
    ...(icon ? { icon } : {}),
    ...(isWindows
      ? {
          frame: true,
          thickFrame: true,
          titleBarStyle: 'hidden' as const,
          titleBarOverlay: {
            ...WINDOWS_TITLE_BAR_OVERLAY.dark,
            height: WINDOW_BAR_HEIGHT
          }
        }
      : { frame: false }),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    void openExternalUrl(details.url).catch((error) => {
      console.error('Failed to open external URL:', error)
    })
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.osumeta.app')
  setupBeatmapProtocolHandler()

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  registerIpcHandlers()
  createWindow()
  initAutoUpdater()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
