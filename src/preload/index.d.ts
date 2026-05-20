import { ElectronAPI } from '@electron-toolkit/preload'
import type {
  AppSettings,
  BeatmapMetadata,
  BeatmapSetSummary,
  CurrentBeatmapLookupResult,
  DetectedPath,
  ImportSourceData,
  LoadedMetadata,
  OsuBeatmapsetSearchHit,
  RankedSourceSuggestionResult,
  SaveMetadataPayload,
  SaveMetadataResult,
  SuggestRankedSourceRequest,
  TagSectionsExpanded
} from '../shared/types'

export interface OsuMetaAPI {
  getSettings: () => Promise<AppSettings>
  detectSongsPaths: () => Promise<DetectedPath[]>
  getDefaultSongsPath: () => Promise<string | null>
  pickSongsFolder: (defaultPath?: string) => Promise<string | null>
  setSongsPath: (path: string) => Promise<string>
  scanBeatmaps: (force?: boolean) => Promise<BeatmapSetSummary[]>
  loadMetadata: (folderPath: string) => Promise<LoadedMetadata>
  loadMetadataFromBeatmapSet: (beatmapSetId: number) => Promise<BeatmapMetadata>
  loadImportSourceFromBeatmapSet: (beatmapSetId: number) => Promise<ImportSourceData>
  searchBeatmapsetsOnOsu: (query: string) => Promise<OsuBeatmapsetSearchHit[]>
  saveMetadata: (folderPath: string, payload: SaveMetadataPayload) => Promise<SaveMetadataResult>
  getAppVersion: () => Promise<string>
  lookupCurrentBeatmap: (beatmaps?: BeatmapSetSummary[]) => Promise<CurrentBeatmapLookupResult>
  openBeatmapFolder: (folderPath: string) => Promise<void>
  openBeatmapPage: (beatmapSetId: number) => Promise<void>
  checkBeatmapSetOnline: (beatmapSetId: number) => Promise<boolean>
  suggestRankedSource: (
    request: SuggestRankedSourceRequest
  ) => Promise<RankedSourceSuggestionResult>
  isOsuApiConfigured: () => Promise<boolean>
  isOsuRunning: () => Promise<boolean>
  isDuplicateWarningIgnored: (folderPath: string) => Promise<boolean>
  setDuplicateWarningIgnored: (folderPath: string, ignored: boolean) => Promise<void>
  isArtistTitleTagWarningIgnored: (folderPath: string) => Promise<boolean>
  setArtistTitleTagWarningIgnored: (folderPath: string, ignored: boolean) => Promise<void>
  getDismissedWrongTagHints: (folderPath: string) => Promise<string[]>
  dismissWrongTagHint: (folderPath: string, ruleId: string) => Promise<void>
  setTagSectionsExpanded: (value: TagSectionsExpanded) => Promise<void>
  setSidebarWidth: (width: number) => Promise<void>
  setCloseBlocked: (blocked: boolean) => Promise<void>
  confirmAppClose: () => Promise<void>
  onRequestCloseConfirm: (callback: () => void) => () => void
  onUpdaterUpToDate: (callback: () => void) => () => void
  window: {
    minimize: () => void
    toggleMaximize: () => void
    close: () => void
  }
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: OsuMetaAPI
  }
}
