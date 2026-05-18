export interface BeatmapMetadata {
  artist: string
  artistUnicode: string
  title: string
  titleUnicode: string
  tags: string
}

export interface BeatmapSetSummary {
  folderPath: string
  folderName: string
  displayName: string
  diffCount: number
  backgroundImageUrl: string | null
}

export interface LoadedMetadata {
  metadata: BeatmapMetadata
  mismatched: boolean
  diffCount: number
}

export interface AppSettings {
  songsPath: string | null
}

export interface DetectedPath {
  label: string
  path: string
  exists: boolean
}

export interface SaveMetadataResult {
  updatedFiles: number
}
