import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type {
  AppSettings,
  BeatmapMetadata,
  BeatmapSetSummary,
  DetectedPath,
  LoadedMetadata,
  SaveMetadataResult
} from '../shared/types'

const api = {
  getSettings: (): Promise<AppSettings> => ipcRenderer.invoke('get-settings'),
  detectSongsPaths: (): Promise<DetectedPath[]> => ipcRenderer.invoke('detect-songs-paths'),
  getDefaultSongsPath: (): Promise<string | null> => ipcRenderer.invoke('get-default-songs-path'),
  pickSongsFolder: (): Promise<string | null> => ipcRenderer.invoke('pick-songs-folder'),
  setSongsPath: (path: string): Promise<string> => ipcRenderer.invoke('set-songs-path', path),
  scanBeatmaps: (): Promise<BeatmapSetSummary[]> => ipcRenderer.invoke('scan-beatmaps'),
  loadMetadata: (folderPath: string): Promise<LoadedMetadata> =>
    ipcRenderer.invoke('load-metadata', folderPath),
  saveMetadata: (
    folderPath: string,
    metadata: BeatmapMetadata
  ): Promise<SaveMetadataResult> => ipcRenderer.invoke('save-metadata', folderPath, metadata)
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
