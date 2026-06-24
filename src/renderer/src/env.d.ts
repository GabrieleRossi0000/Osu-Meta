/// <reference types="vite/client" />

import type {
  AppSettings,
  BeatmapComboColour,
  BeatmapDifficultySummary,
  BeatmapMetadata,
  BeatmapSetSummary,
  DetectedPath,
  ImportMetadataSource,
  ImportSourceData,
  LoadedMetadata,
  OsuBeatmapsetSearchHit,
  RankedGenreLanguageResult,
  RankedSourceSuggestionResult,
  SaveMetadataPayload,
  SaveMetadataResult,
  SuggestRankedGenreLanguageRequest,
  SuggestRankedSourceRequest,
  CurrentBeatmapLookupResult,
  TagSectionsExpanded,
  GuestMapperTagSuggestion,
  SetOwnerAlternateTagSuggestion
} from '@shared/types'
import type { UpdaterDialogAction, UpdaterDialogPayload } from '@shared/updater-dialog'

interface WindowApi {
  getSettings: () => Promise<AppSettings>
  detectSongsPaths: () => Promise<DetectedPath[]>
  getDefaultSongsPath: () => Promise<string | null>
  pickSongsFolder: (defaultPath?: string) => Promise<string | null>
  setSongsPath: (path: string) => Promise<string>
  scanBeatmaps: (force?: boolean) => Promise<BeatmapSetSummary[]>
  loadMetadata: (folderPath: string) => Promise<LoadedMetadata>
  loadDifficultySummaries: (folderPath: string) => Promise<BeatmapDifficultySummary[]>
  loadMetadataFromBeatmapSet: (beatmapSetId: number) => Promise<BeatmapMetadata>
  loadImportSourceFromBeatmapSet: (beatmapSetId: number) => Promise<ImportSourceData>
  searchBeatmapsetsOnOsu: (query: string) => Promise<OsuBeatmapsetSearchHit[]>
  saveMetadata: (folderPath: string, payload: SaveMetadataPayload) => Promise<SaveMetadataResult>
  getAppVersion: () => Promise<string>
  checkForUpdates: () => Promise<void>
  lookupCurrentBeatmap: (beatmaps?: BeatmapSetSummary[]) => Promise<CurrentBeatmapLookupResult>
  openBeatmapFolder: (folderPath: string) => Promise<void>
  openBeatmapPage: (beatmapSetId: number) => Promise<void>
  checkBeatmapSetOnline: (beatmapSetId: number) => Promise<boolean>
  suggestRankedSource: (
    request: SuggestRankedSourceRequest
  ) => Promise<RankedSourceSuggestionResult>
  suggestRankedGenreLanguage: (
    request: SuggestRankedGenreLanguageRequest
  ) => Promise<RankedGenreLanguageResult>
  isOsuApiConfigured: () => Promise<boolean>
  isOsuRunning: () => Promise<boolean>
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
  onUpdaterDialog: (callback: (payload: UpdaterDialogPayload) => void) => () => void
  onUpdaterInstalling: (callback: () => void) => () => void
  respondToUpdaterDialog: (action: UpdaterDialogAction) => Promise<void>
  suggestGuestMapperApiTags: (beatmapSetId: number) => Promise<GuestMapperTagSuggestion[]>
  suggestHostAlternateNameTags: (
    beatmapSetId: number
  ) => Promise<SetOwnerAlternateTagSuggestion[]>
  window: {
    minimize: () => void
    toggleMaximize: () => void
    close: () => void
  }
}

declare global {
  interface Window {
    api: WindowApi
  }
}

export {}
