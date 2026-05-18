export interface BeatmapMetadata {
  artist: string
  artistUnicode: string
  title: string
  titleUnicode: string
  tags: string
}

export interface BeatmapSetFlags {
  needsTags: boolean
  hasDuplicates: boolean
  mismatchedMetadata: boolean
  faMissingGuild: boolean
}

export interface BeatmapSetSummary {
  folderPath: string
  folderName: string
  displayName: string
  diffCount: number
  backgroundImageUrl: string | null
  beatmapSetId: number | null
  lastModifiedAt: number
  hiddenDuplicateCount: number
  flags: BeatmapSetFlags
}

export interface BeatmapDifficultySummary {
  version: string
  mode: number
  starRating: number
  iconUrl: string
  filename: string
}

export interface LoadedMetadata {
  metadata: BeatmapMetadata
  mismatched: boolean
  diffCount: number
  lockArtistRomanized: boolean
  lockTitleRomanized: boolean
  difficultyVersions: string[]
  difficulties: BeatmapDifficultySummary[]
  creator: string
  source: string
  isFeaturedArtist: boolean
  isOnOsuWebsite: boolean
}

export interface TagSectionsExpanded {
  featured: boolean
  source: boolean
  guest: boolean
  guild: boolean
  collab: boolean
  wrongTags: boolean
}

export interface ScanCacheEntry {
  lastModifiedMs: number
  summary: BeatmapSetSummary
}

export interface ScanCache {
  songsPath: string
  entries: Record<string, ScanCacheEntry>
}

export interface AppSettings {
  songsPath: string | null
  ignoredDuplicateFolders: string[]
  tagSectionsExpanded: TagSectionsExpanded
  dismissedWrongTagHints: Record<string, string[]>
  scanCache: ScanCache | null
  sidebarWidth: number
  featuredArtistCache: Record<string, boolean>
  beatmapSetOnlineCache: Record<string, boolean>
}

export interface DetectedPath {
  label: string
  path: string
  exists: boolean
}

export interface SaveMetadataResult {
  updatedFiles: number
}

export type CurrentBeatmapStatus =
  | 'folder_found'
  | 'metadata_detected'
  | 'no_editor_title'
  | 'display_title_found'
  | 'no_process'
  | 'songs_folder_not_found'
  | 'unsupported_platform'

export interface CurrentBeatmapLookupResult {
  status: CurrentBeatmapStatus
  message: string
  metadataFilename: string | null
  displayTitle: string | null
  folderPath: string | null
}
