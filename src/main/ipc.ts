import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import { existsSync } from 'fs'
import { scanBeatmapSets, isDirectory } from './beatmap-scanner'
import { lookupCurrentBeatmap } from './current-beatmap'
import { coerceSaveMetadataPayload } from '../shared/metadata-utils'
import {
  loadSetMetadata,
  loadImportSourceFromBeatmapSetId,
  loadMetadataFromBeatmapSetId,
  saveSetMetadata
} from './metadata-service'
import { isOsuProcessRunning } from './osu-process'
import { openBeatmapFolder } from './open-beatmap'
import { checkBeatmapSetOnline } from './beatmap-set-online'
import { openBeatmapPage } from './open-beatmap-page'
import { checkForUpdatesNow } from './updater'
import { getCandidateSongsPaths, getFirstExistingSongsPath } from './osu-paths'
import {
  dismissWrongTagHint,
  getDismissedWrongTagHints,
  getSettings,
  isArtistTitleTagWarningIgnored,
  isDuplicateWarningIgnored,
  setArtistTitleTagWarningIgnored,
  setDuplicateWarningIgnored,
  setSongsPath,
  setSidebarWidth,
  setTagSectionsExpanded
} from './settings'
import type {
  BeatmapComboColour,
  BeatmapMetadata,
  BeatmapSetSummary,
  SaveMetadataPayload,
  SuggestRankedSourceRequest,
  TagSectionsExpanded
} from '../shared/types'
import { suggestRankedSource } from './source-suggestion-service'
import { isOsuApiConfigured, searchBeatmapsetsOnOsu } from './osu-api-client'

const closeBlockedByRenderer = new WeakMap<BrowserWindow, boolean>()

export function registerIpcHandlers(): void {
  ipcMain.handle('get-settings', () => getSettings())

  ipcMain.handle('detect-songs-paths', () => getCandidateSongsPaths())

  ipcMain.handle('get-default-songs-path', () => getFirstExistingSongsPath())

  ipcMain.handle('pick-songs-folder', async (_event, defaultPath?: string) => {
    const openAt =
      typeof defaultPath === 'string' && defaultPath.length > 0 && existsSync(defaultPath)
        ? defaultPath
        : undefined

    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Select osu! Songs folder',
      ...(openAt ? { defaultPath: openAt } : {})
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

  ipcMain.handle('scan-beatmaps', (_event, force?: boolean) => {
    const { songsPath } = getSettings()
    if (!songsPath) {
      return []
    }
    return scanBeatmapSets(songsPath, Boolean(force))
  })

  ipcMain.handle('load-metadata', async (_event, folderPath: string) => {
    return loadSetMetadata(folderPath)
  })

  ipcMain.handle('load-metadata-from-beatmap-set', async (_event, beatmapSetId: number) => {
    return loadMetadataFromBeatmapSetId(beatmapSetId)
  })

  ipcMain.handle('load-import-source-from-beatmap-set', async (_event, beatmapSetId: number) => {
    return loadImportSourceFromBeatmapSetId(beatmapSetId)
  })

  ipcMain.handle('search-beatmapsets-on-osu', async (_event, query: string) => {
    return searchBeatmapsetsOnOsu(query)
  })

  ipcMain.handle(
    'save-metadata',
    (
      _event,
      folderPath: string,
      payload: SaveMetadataPayload,
      comboColours?: BeatmapComboColour[],
      savedMetadata?: BeatmapMetadata,
      savedComboColours?: BeatmapComboColour[]
    ) => {
      return saveSetMetadata(
        folderPath,
        coerceSaveMetadataPayload(payload, comboColours, savedMetadata, savedComboColours)
      )
    }
  )

  ipcMain.handle('get-app-version', () => app.getVersion())

  ipcMain.handle('check-for-updates', () => checkForUpdatesNow())

  ipcMain.handle('lookup-current-beatmap', (_event, beatmaps?: BeatmapSetSummary[]) => {
    const { songsPath } = getSettings()
    if (!songsPath) {
      return {
        status: 'songs_folder_not_found',
        message: 'Songs folder is not configured.',
        metadataFilename: null,
        displayTitle: null,
        folderPath: null
      }
    }
    return lookupCurrentBeatmap(songsPath, beatmaps)
  })

  ipcMain.handle('open-beatmap-folder', (_event, folderPath: string) => {
    openBeatmapFolder(folderPath)
  })

  ipcMain.handle('open-beatmap-page', (_event, beatmapSetId: number) =>
    openBeatmapPage(beatmapSetId)
  )

  ipcMain.handle('check-beatmap-set-online', (_event, beatmapSetId: number) =>
    checkBeatmapSetOnline(beatmapSetId)
  )

  ipcMain.handle('suggest-ranked-source', (_event, request: SuggestRankedSourceRequest) =>
    suggestRankedSource(request, request.beatmapSetId, { refresh: request.refresh })
  )

  ipcMain.handle('is-osu-api-configured', () => isOsuApiConfigured())

  ipcMain.handle('is-osu-running', () => isOsuProcessRunning())

  ipcMain.handle('is-duplicate-warning-ignored', (_event, folderPath: string) => {
    return isDuplicateWarningIgnored(folderPath)
  })

  ipcMain.handle(
    'set-duplicate-warning-ignored',
    (_event, folderPath: string, ignored: boolean) => {
      setDuplicateWarningIgnored(folderPath, ignored)
    }
  )

  ipcMain.handle('is-artist-title-tag-warning-ignored', (_event, folderPath: string) => {
    return isArtistTitleTagWarningIgnored(folderPath)
  })

  ipcMain.handle(
    'set-artist-title-tag-warning-ignored',
    (_event, folderPath: string, ignored: boolean) => {
      setArtistTitleTagWarningIgnored(folderPath, ignored)
    }
  )

  ipcMain.handle('get-dismissed-wrong-tag-hints', (_event, folderPath: string) => {
    return getDismissedWrongTagHints(folderPath)
  })

  ipcMain.handle('dismiss-wrong-tag-hint', (_event, folderPath: string, ruleId: string) => {
    dismissWrongTagHint(folderPath, ruleId)
  })

  ipcMain.handle('set-tag-sections-expanded', (_event, value: TagSectionsExpanded) => {
    setTagSectionsExpanded(value)
  })

  ipcMain.handle('set-sidebar-width', (_event, width: number) => {
    setSidebarWidth(width)
  })

  ipcMain.handle('set-close-blocked', (event, blocked: boolean) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win) closeBlockedByRenderer.set(win, blocked)
  })

  ipcMain.handle('confirm-app-close', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return
    closeBlockedByRenderer.set(win, false)
    win.close()
  })

  ipcMain.on('window-minimize', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize()
  })

  ipcMain.on('window-toggle-maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return
    if (win.isMaximized()) win.unmaximize()
    else win.maximize()
  })

  ipcMain.on('window-close', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return
    if (closeBlockedByRenderer.get(win)) {
      win.webContents.send('request-close-confirm')
      return
    }
    win.close()
  })

  app.on('browser-window-created', (_event, window) => {
    window.on('close', (e) => {
      if (closeBlockedByRenderer.get(window)) {
        e.preventDefault()
        window.webContents.send('request-close-confirm')
      }
    })
  })
}
