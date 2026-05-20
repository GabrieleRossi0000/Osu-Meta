import { BrowserWindow } from 'electron'
import type { UpdaterDialogAction, UpdaterDialogPayload } from '../shared/updater-dialog'

let pendingResolve: ((action: UpdaterDialogAction) => void) | null = null

function getWindow(): BrowserWindow | null {
  const win = BrowserWindow.getAllWindows()[0]
  return win && !win.isDestroyed() ? win : null
}

export function showUpdaterDialog(payload: UpdaterDialogPayload): Promise<UpdaterDialogAction> {
  const win = getWindow()
  if (!win) {
    return Promise.resolve('dismiss')
  }

  return new Promise((resolve) => {
    pendingResolve = resolve
    win.webContents.send('updater:dialog', payload)
  })
}

export function resolveUpdaterDialog(action: UpdaterDialogAction): void {
  pendingResolve?.(action)
  pendingResolve = null
}

export function notifyUpdaterInstalling(latestVersion: string): void {
  getWindow()?.webContents.send('updater:installing', { latestVersion })
}

export function notifyUpdaterUpToDate(): void {
  getWindow()?.webContents.send('updater:up-to-date')
}
