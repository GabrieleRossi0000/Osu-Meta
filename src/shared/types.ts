export interface BeatmapMetadata {
  artist: string
  artistUnicode: string
  title: string
  titleUnicode: string
  source: string
  tags: string
}

/** RGB combo colours from `[Colours]` `ComboN` lines (saved as Combo1…ComboN in order). */
export interface BeatmapComboColour {
  r: number
  g: number
  b: number
}

export interface BeatmapSetFlags {
  needsTags: boolean
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

export interface MetadataFieldMismatchDetail {
  field: string
  label: string
  entries: Array<{ version: string; filename: string; value: string }>
}

export interface ComboColourMismatchGroup {
  summary: string
  comboColours: BeatmapComboColour[]
  entries: Array<{ version: string; filename: string }>
}

export interface PerDifficultyComboSnapshot {
  version: string
  filename: string
  comboColours: BeatmapComboColour[]
}

export interface DifficultyGeneralSettings {
  version: string
  filename: string
  genre: string
  language: string
}

export interface LoadedMetadata {
  metadata: BeatmapMetadata
  mismatched: boolean
  /** Metadata fields that differ between .osu files in this set. */
  mismatchedFields: (keyof BeatmapMetadata)[]
  metadataMismatchDetails: MetadataFieldMismatchDetail[]
  comboColours: BeatmapComboColour[]
  comboColoursMismatched: boolean
  comboColourMismatchDetails: ComboColourMismatchGroup[]
  perDifficultyComboColours: PerDifficultyComboSnapshot[]
  difficultyGeneralSettings: DifficultyGeneralSettings[]
  diffCount: number
  lockArtistRomanized: boolean
  lockTitleRomanized: boolean
  difficultyVersions: string[]
  difficulties: BeatmapDifficultySummary[]
  creator: string
  isFeaturedArtist: boolean
  isOnOsuWebsite: boolean
}

export interface RankedSourceSuggestion {
  source: string
  beatmapSetId: number
  artist: string
  title: string
  creator: string
  status: string
}

export type RankedSourceSuggestionResult =
  | { kind: 'found'; suggestion: RankedSourceSuggestion }
  | { kind: 'not_found' }
  | { kind: 'no_source' }
  | { kind: 'unavailable'; message: string }

export interface RankedGenreLanguageSuggestion {
  beatmapSetId: number
  artist: string
  title: string
  creator: string
  rankedDate: string | null
  rankedTags: string
  pageGenre: string
  pageLanguage: string
  genreTags: string[]
  languageTags: string[]
}

export type RankedGenreLanguageResult =
  | { kind: 'found'; suggestion: RankedGenreLanguageSuggestion }
  | { kind: 'not_found' }
  | { kind: 'unavailable'; message: string }

export interface SuggestRankedGenreLanguageRequest {
  artistUnicode: string
  artist: string
  titleUnicode: string
  title: string
  beatmapSetId: number | null
}

export interface TagSectionsExpanded {
  featured: boolean
  source: boolean
  language: boolean
  genre: boolean
  guest: boolean
  guild: boolean
  collab: boolean
  wrongTags: boolean
}

export interface GuestMapperTagSuggestion {
  mapperUsername: string
  tag: string
  kind: 'current' | 'previous'
}

export interface SetOwnerAlternateTagSuggestion {
  previousUsername: string
  tag: string
  sourceBeatmapSetId: number
}

/** @deprecated Use GuestMapperTagSuggestion */
export type GuestMapperHistoricalTagSuggestion = GuestMapperTagSuggestion

export interface ScanCacheEntry {
  lastModifiedMs: number
  summary: BeatmapSetSummary
  /** First .osu in folder — used for fast mtime checks without readdir */
  primaryOsuPath?: string
}

export interface ScanCache {
  songsPath: string
  entries: Record<string, ScanCacheEntry>
}

export interface AppSettings {
  songsPath: string | null
  ignoredArtistTitleTagFolders: string[]
  tagSectionsExpanded: TagSectionsExpanded
  dismissedWrongTagHints: Record<string, string[]>
  scanCache: ScanCache | null
  sidebarWidth: number
  featuredArtistCache: Record<string, boolean>
  beatmapSetOnlineCache: Record<string, boolean>
  sourceSuggestionCache: Record<string, RankedSourceSuggestionResult>
}

export interface DetectedPath {
  label: string
  path: string
  exists: boolean
}

export interface SaveMetadataPayload {
  metadata: BeatmapMetadata
  comboColours: BeatmapComboColour[]
  savedMetadata: BeatmapMetadata
  savedComboColours: BeatmapComboColour[]
}

export interface SaveMetadataResult {
  updatedFiles: number
  updatedMetadataFields: (keyof BeatmapMetadata)[]
  updatedComboColours: boolean
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

export interface SuggestRankedSourceRequest {
  artistUnicode: string
  artist: string
  titleUnicode: string
  title: string
  beatmapSetId: number | null
  /** When true, bypass cached negative results and re-query osu!. */
  refresh?: boolean
}

export interface OsuBeatmapsetSearchHit {
  beatmapSetId: number
  artist: string
  artistUnicode: string
  title: string
  titleUnicode: string
  creator: string
  status: string
  coverUrl: string | null
  /** When the set entered ranked, loved, or qualified — used for import search ordering. */
  leaderboardDateAt: number
  /** Game modes present in this beatmapset (osu, taiko, catch, mania). */
  gameModes: string[]
}

export type ImportMetadataSource =
  | { kind: 'local'; folderPath: string }
  | { kind: 'web'; beatmapSetId: number }

export type ImportMetadataMode = 'full' | 'tags' | 'song'

export interface ImportSourceData {
  metadata: BeatmapMetadata
  comboColours: BeatmapComboColour[]
  /** Modes present in the source set (osu, taiko, fruits, mania). */
  gameModes: string[]
}
