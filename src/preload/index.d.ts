import { ElectronAPI } from '@electron-toolkit/preload'
import type {
  AppSettings,
  BeatmapMetadata,
  BeatmapSetSummary,
  DetectedPath,
  LoadedMetadata,
  SaveMetadataResult
} from '../shared/types'

export interface OsuMetaAPI {
  getSettings: () => Promise<AppSettings>
  detectSongsPaths: () => Promise<DetectedPath[]>
  getDefaultSongsPath: () => Promise<string | null>
  pickSongsFolder: () => Promise<string | null>
  setSongsPath: (path: string) => Promise<string>
  scanBeatmaps: () => Promise<BeatmapSetSummary[]>
  loadMetadata: (folderPath: string) => Promise<LoadedMetadata>
  saveMetadata: (folderPath: string, metadata: BeatmapMetadata) => Promise<SaveMetadataResult>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: OsuMetaAPI
  }
}
