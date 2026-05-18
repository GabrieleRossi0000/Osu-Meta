import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type {
  AppSettings,
  BeatmapMetadata,
  BeatmapSetSummary,
  CurrentBeatmapLookupResult,
  DetectedPath,
  LoadedMetadata,
  SaveMetadataResult,
  TagSectionsExpanded
} from '../shared/types'

const api = {
  getSettings: (): Promise<AppSettings> => ipcRenderer.invoke('get-settings'),
  detectSongsPaths: (): Promise<DetectedPath[]> => ipcRenderer.invoke('detect-songs-paths'),
  getDefaultSongsPath: (): Promise<string | null> => ipcRenderer.invoke('get-default-songs-path'),
  pickSongsFolder: (): Promise<string | null> => ipcRenderer.invoke('pick-songs-folder'),
  setSongsPath: (path: string): Promise<string> => ipcRenderer.invoke('set-songs-path', path),
  scanBeatmaps: (force?: boolean): Promise<BeatmapSetSummary[]> =>
    ipcRenderer.invoke('scan-beatmaps', force),
  loadMetadata: (folderPath: string): Promise<LoadedMetadata> =>
    ipcRenderer.invoke('load-metadata', folderPath),
  saveMetadata: (
    folderPath: string,
    metadata: BeatmapMetadata
  ): Promise<SaveMetadataResult> => ipcRenderer.invoke('save-metadata', folderPath, metadata),
  getAppVersion: (): Promise<string> => ipcRenderer.invoke('get-app-version'),
  lookupCurrentBeatmap: (beatmaps?: BeatmapSetSummary[]): Promise<CurrentBeatmapLookupResult> =>
    ipcRenderer.invoke('lookup-current-beatmap', beatmaps),
  openBeatmapFolder: (folderPath: string): Promise<void> =>
    ipcRenderer.invoke('open-beatmap-folder', folderPath),
  openBeatmapPage: (beatmapSetId: number): Promise<void> =>
    ipcRenderer.invoke('open-beatmap-page', beatmapSetId),
  checkBeatmapSetOnline: (beatmapSetId: number): Promise<boolean> =>
    ipcRenderer.invoke('check-beatmap-set-online', beatmapSetId),
  isOsuRunning: (): Promise<boolean> => ipcRenderer.invoke('is-osu-running'),
  isDuplicateWarningIgnored: (folderPath: string): Promise<boolean> =>
    ipcRenderer.invoke('is-duplicate-warning-ignored', folderPath),
  setDuplicateWarningIgnored: (folderPath: string, ignored: boolean): Promise<void> =>
    ipcRenderer.invoke('set-duplicate-warning-ignored', folderPath, ignored),
  getDismissedWrongTagHints: (folderPath: string): Promise<string[]> =>
    ipcRenderer.invoke('get-dismissed-wrong-tag-hints', folderPath),
  dismissWrongTagHint: (folderPath: string, ruleId: string): Promise<void> =>
    ipcRenderer.invoke('dismiss-wrong-tag-hint', folderPath, ruleId),
  setTagSectionsExpanded: (value: TagSectionsExpanded): Promise<void> =>
    ipcRenderer.invoke('set-tag-sections-expanded', value),
  setSidebarWidth: (width: number): Promise<void> =>
    ipcRenderer.invoke('set-sidebar-width', width),
  setCloseBlocked: (blocked: boolean): Promise<void> =>
    ipcRenderer.invoke('set-close-blocked', blocked),
  confirmAppClose: (): Promise<void> => ipcRenderer.invoke('confirm-app-close'),
  onRequestCloseConfirm: (callback: () => void): (() => void) => {
    const listener = (): void => callback()
    ipcRenderer.on('request-close-confirm', listener)
    return () => ipcRenderer.removeListener('request-close-confirm', listener)
  },
  window: {
    minimize: (): void => ipcRenderer.send('window-minimize'),
    toggleMaximize: (): void => ipcRenderer.send('window-toggle-maximize'),
    close: (): void => ipcRenderer.send('window-close')
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-expect-error exposed in non-isolated mode
  window.electron = electronAPI
  // @ts-expect-error exposed in non-isolated mode
  window.api = api
}
