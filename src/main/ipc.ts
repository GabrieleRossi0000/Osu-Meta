import { dialog, ipcMain } from 'electron'
import { existsSync } from 'fs'
import { scanBeatmapSets, isDirectory } from './beatmap-scanner'
import { loadSetMetadata, saveSetMetadata } from './metadata-service'
import { getCandidateSongsPaths, getFirstExistingSongsPath } from './osu-paths'
import { getSettings, setSongsPath } from './settings'
import type { BeatmapMetadata } from '../shared/types'

export function registerIpcHandlers(): void {
  ipcMain.handle('get-settings', () => getSettings())

  ipcMain.handle('detect-songs-paths', () => getCandidateSongsPaths())

  ipcMain.handle('get-default-songs-path', () => getFirstExistingSongsPath())

  ipcMain.handle('pick-songs-folder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Select osu! Songs folder'
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    const selected = result.filePaths[0]
    if (!isDirectory(selected)) {
      throw new Error('Selected path is not a directory.')
    }

    setSongsPath(selected)
    return selected
  })

  ipcMain.handle('set-songs-path', (_event, path: string) => {
    if (!existsSync(path) || !isDirectory(path)) {
      throw new Error('Invalid Songs folder path.')
    }
    setSongsPath(path)
    return path
  })

  ipcMain.handle('scan-beatmaps', () => {
    const { songsPath } = getSettings()
    if (!songsPath) {
      return []
    }
    return scanBeatmapSets(songsPath)
  })

  ipcMain.handle('load-metadata', (_event, folderPath: string) => {
    return loadSetMetadata(folderPath)
  })

  ipcMain.handle(
    'save-metadata',
    (_event, folderPath: string, metadata: BeatmapMetadata) => {
      return saveSetMetadata(folderPath, metadata)
    }
  )
}
