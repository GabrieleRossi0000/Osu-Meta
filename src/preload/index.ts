import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type {
  AppSettings,
  BeatmapMetadata,
  BeatmapDifficultySummary,
  BeatmapSetSummary,
  CurrentBeatmapLookupResult,
  DetectedPath,
  ImportSourceData,
  LoadedMetadata,
  OsuBeatmapsetSearchHit,
  RankedGenreLanguageResult,
  RankedSourceSuggestionResult,
  SaveMetadataPayload,
  SaveMetadataResult,
  SuggestRankedGenreLanguageRequest,
  SuggestRankedSourceRequest,
  TagSectionsExpanded,
  GuestMapperTagSuggestion,
  SetOwnerAlternateTagSuggestion
} from '../shared/types'
import type { UpdaterDialogAction, UpdaterDialogPayload } from '../shared/updater-dialog'

const api = {
  getSettings: (): Promise<AppSettings> => ipcRenderer.invoke('get-settings'),
  detectSongsPaths: (): Promise<DetectedPath[]> => ipcRenderer.invoke('detect-songs-paths'),
  getDefaultSongsPath: (): Promise<string | null> => ipcRenderer.invoke('get-default-songs-path'),
  pickSongsFolder: (defaultPath?: string): Promise<string | null> =>
    ipcRenderer.invoke('pick-songs-folder', defaultPath),
  setSongsPath: (path: string): Promise<string> => ipcRenderer.invoke('set-songs-path', path),
  scanBeatmaps: (force?: boolean): Promise<BeatmapSetSummary[]> =>
    ipcRenderer.invoke('scan-beatmaps', force),
  loadMetadata: (folderPath: string): Promise<LoadedMetadata> =>
    ipcRenderer.invoke('load-metadata', folderPath),
  loadDifficultySummaries: (folderPath: string): Promise<BeatmapDifficultySummary[]> =>
    ipcRenderer.invoke('load-difficulty-summaries', folderPath),
  loadMetadataFromBeatmapSet: (beatmapSetId: number): Promise<BeatmapMetadata> =>
    ipcRenderer.invoke('load-metadata-from-beatmap-set', beatmapSetId),
  loadImportSourceFromBeatmapSet: (beatmapSetId: number): Promise<ImportSourceData> =>
    ipcRenderer.invoke('load-import-source-from-beatmap-set', beatmapSetId),
  searchBeatmapsetsOnOsu: (query: string): Promise<OsuBeatmapsetSearchHit[]> =>
    ipcRenderer.invoke('search-beatmapsets-on-osu', query),
  saveMetadata: (folderPath: string, payload: SaveMetadataPayload): Promise<SaveMetadataResult> =>
    ipcRenderer.invoke('save-metadata', folderPath, payload),
  getAppVersion: (): Promise<string> => ipcRenderer.invoke('get-app-version'),
  checkForUpdates: (): Promise<void> => ipcRenderer.invoke('check-for-updates'),
  lookupCurrentBeatmap: (beatmaps?: BeatmapSetSummary[]): Promise<CurrentBeatmapLookupResult> =>
    ipcRenderer.invoke('lookup-current-beatmap', beatmaps),
  openBeatmapFolder: (folderPath: string): Promise<void> =>
    ipcRenderer.invoke('open-beatmap-folder', folderPath),
  openBeatmapPage: (beatmapSetId: number): Promise<void> =>
    ipcRenderer.invoke('open-beatmap-page', beatmapSetId),
  checkBeatmapSetOnline: (beatmapSetId: number): Promise<boolean> =>
    ipcRenderer.invoke('check-beatmap-set-online', beatmapSetId),
  suggestRankedSource: (request: SuggestRankedSourceRequest): Promise<RankedSourceSuggestionResult> =>
    ipcRenderer.invoke('suggest-ranked-source', request),
  suggestRankedGenreLanguage: (
    request: SuggestRankedGenreLanguageRequest
  ): Promise<RankedGenreLanguageResult> =>
    ipcRenderer.invoke('suggest-ranked-genre-language', request),
  isOsuApiConfigured: (): Promise<boolean> => ipcRenderer.invoke('is-osu-api-configured'),
  isOsuRunning: (): Promise<boolean> => ipcRenderer.invoke('is-osu-running'),
  isArtistTitleTagWarningIgnored: (folderPath: string): Promise<boolean> =>
    ipcRenderer.invoke('is-artist-title-tag-warning-ignored', folderPath),
  setArtistTitleTagWarningIgnored: (folderPath: string, ignored: boolean): Promise<void> =>
    ipcRenderer.invoke('set-artist-title-tag-warning-ignored', folderPath, ignored),
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
  onUpdaterUpToDate: (callback: () => void): (() => void) => {
    const listener = (): void => callback()
    ipcRenderer.on('updater:up-to-date', listener)
    return () => ipcRenderer.removeListener('updater:up-to-date', listener)
  },
  onUpdaterDialog: (callback: (payload: UpdaterDialogPayload) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: UpdaterDialogPayload): void =>
      callback(payload)
    ipcRenderer.on('updater:dialog', listener)
    return () => ipcRenderer.removeListener('updater:dialog', listener)
  },
  onUpdaterInstalling: (callback: () => void): (() => void) => {
    const listener = (): void => callback()
    ipcRenderer.on('updater:installing', listener)
    return () => ipcRenderer.removeListener('updater:installing', listener)
  },
  respondToUpdaterDialog: (action: UpdaterDialogAction): Promise<void> =>
    ipcRenderer.invoke('updater:respond', action),
  suggestGuestMapperApiTags: (beatmapSetId: number): Promise<GuestMapperTagSuggestion[]> =>
    ipcRenderer.invoke('suggest-guest-mapper-api-tags', beatmapSetId),
  suggestHostAlternateNameTags: (
    beatmapSetId: number
  ): Promise<SetOwnerAlternateTagSuggestion[]> =>
    ipcRenderer.invoke('suggest-host-alternate-name-tags', beatmapSetId),
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
