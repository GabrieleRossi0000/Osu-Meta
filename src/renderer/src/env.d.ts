/// <reference types="vite/client" />

import type {
  AppSettings,
  BeatmapMetadata,
  BeatmapSetSummary,
  DetectedPath,
  LoadedMetadata,
  SaveMetadataResult,
  CurrentBeatmapLookupResult,
  TagSectionsExpanded
} from '@shared/types'

interface WindowApi {
  getSettings: () => Promise<AppSettings>
  detectSongsPaths: () => Promise<DetectedPath[]>
  getDefaultSongsPath: () => Promise<string | null>
  pickSongsFolder: () => Promise<string | null>
  setSongsPath: (path: string) => Promise<string>
  scanBeatmaps: (force?: boolean) => Promise<BeatmapSetSummary[]>
  loadMetadata: (folderPath: string) => Promise<LoadedMetadata>
  saveMetadata: (folderPath: string, metadata: BeatmapMetadata) => Promise<SaveMetadataResult>
  getAppVersion: () => Promise<string>
  lookupCurrentBeatmap: (beatmaps?: BeatmapSetSummary[]) => Promise<CurrentBeatmapLookupResult>
  openBeatmapFolder: (folderPath: string) => Promise<void>
  openBeatmapPage: (beatmapSetId: number) => Promise<void>
  checkBeatmapSetOnline: (beatmapSetId: number) => Promise<boolean>
  isOsuRunning: () => Promise<boolean>
  isDuplicateWarningIgnored: (folderPath: string) => Promise<boolean>
  setDuplicateWarningIgnored: (folderPath: string, ignored: boolean) => Promise<void>
  getDismissedWrongTagHints: (folderPath: string) => Promise<string[]>
  dismissWrongTagHint: (folderPath: string, ruleId: string) => Promise<void>
  setTagSectionsExpanded: (value: TagSectionsExpanded) => Promise<void>
  setSidebarWidth: (width: number) => Promise<void>
  setCloseBlocked: (blocked: boolean) => Promise<void>
  confirmAppClose: () => Promise<void>
  onRequestCloseConfirm: (callback: () => void) => () => void
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
