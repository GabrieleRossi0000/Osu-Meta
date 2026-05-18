import { app } from 'electron'
import { existsSync } from 'fs'
import { join } from 'path'

/** Resolve app icon for BrowserWindow / taskbar (dev + packaged). */
export function getAppIconPath(): string | undefined {
  const resourcesPath = process.resourcesPath

  const candidates = [
    join(__dirname, '../../build/icon.ico'),
    join(__dirname, '../../build/icon.png'),
    join(__dirname, '../../resources/icon.png'),
    join(resourcesPath, 'app-icon.ico'),
    join(resourcesPath, 'app-icon.png'),
    join(app.getAppPath(), 'build', 'icon.ico'),
    join(app.getAppPath(), 'build', 'icon.png'),
    join(app.getAppPath(), 'resources', 'icon.png')
  ]

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate
  }

  return undefined
}
