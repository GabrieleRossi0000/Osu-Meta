import Store from 'electron-store'
import type { AppSettings, RankedSourceSuggestionResult, ScanCache, TagSectionsExpanded } from '../shared/types'

const DEFAULT_TAG_SECTIONS: TagSectionsExpanded = {
  featured: true,
  source: true,
  language: true,
  genre: true,
  guest: true,
  guild: true,
  collab: true,
  wrongTags: true
}

function normalizeTagSectionsExpanded(value: Partial<TagSectionsExpanded> | undefined): TagSectionsExpanded {
  return { ...DEFAULT_TAG_SECTIONS, ...value }
}

const store = new Store<AppSettings>({
  name: 'osu-meta-settings',
  defaults: {
    songsPath: null,
    ignoredArtistTitleTagFolders: [],
    tagSectionsExpanded: DEFAULT_TAG_SECTIONS,
    dismissedWrongTagHints: {},
    scanCache: null,
    sidebarWidth: 256,
    featuredArtistCache: {},
    beatmapSetOnlineCache: {},
    sourceSuggestionCache: {}
  }
})

export function getSettings(): AppSettings {
  return {
    songsPath: store.get('songsPath'),
    ignoredArtistTitleTagFolders: store.get('ignoredArtistTitleTagFolders') ?? [],
    tagSectionsExpanded: normalizeTagSectionsExpanded(store.get('tagSectionsExpanded')),
    dismissedWrongTagHints: store.get('dismissedWrongTagHints') ?? {},
    scanCache: store.get('scanCache') ?? null,
    sidebarWidth: store.get('sidebarWidth') ?? 256,
    featuredArtistCache: store.get('featuredArtistCache') ?? {},
    beatmapSetOnlineCache: store.get('beatmapSetOnlineCache') ?? {},
    sourceSuggestionCache: store.get('sourceSuggestionCache') ?? {}
  }
}

export function setSongsPath(path: string): void {
  store.set('songsPath', path)
  store.set('scanCache', null)
}

export function clearSongsPath(): void {
  store.set('songsPath', null)
  store.set('scanCache', null)
}

export function isArtistTitleTagWarningIgnored(folderPath: string): boolean {
  const list = store.get('ignoredArtistTitleTagFolders') ?? []
  return list.some((entry) => entry.toLowerCase() === folderPath.toLowerCase())
}

export function setArtistTitleTagWarningIgnored(folderPath: string, ignored: boolean): void {
  const list = store.get('ignoredArtistTitleTagFolders') ?? []
  const key = folderPath.toLowerCase()
  const next = ignored
    ? list.some((entry) => entry.toLowerCase() === key)
      ? list
      : [...list, folderPath]
    : list.filter((entry) => entry.toLowerCase() !== key)
  store.set('ignoredArtistTitleTagFolders', next)
}

export function getTagSectionsExpanded(): TagSectionsExpanded {
  return normalizeTagSectionsExpanded(store.get('tagSectionsExpanded'))
}

export function setTagSectionsExpanded(value: TagSectionsExpanded): void {
  store.set('tagSectionsExpanded', value)
}

export function getDismissedWrongTagHints(folderPath: string): string[] {
  const map = store.get('dismissedWrongTagHints') ?? {}
  return map[folderPath] ?? []
}

export function dismissWrongTagHint(folderPath: string, ruleId: string): void {
  const map = { ...(store.get('dismissedWrongTagHints') ?? {}) }
  const current = new Set(map[folderPath] ?? [])
  current.add(ruleId)
  map[folderPath] = [...current]
  store.set('dismissedWrongTagHints', map)
}

export function getScanCache(): ScanCache | null {
  return store.get('scanCache') ?? null
}

export function setScanCache(cache: ScanCache | null): void {
  store.set('scanCache', cache)
}

export function setSidebarWidth(width: number): void {
  store.set('sidebarWidth', width)
}

export function getFeaturedArtistCached(setId: number): boolean | undefined {
  const cache = store.get('featuredArtistCache') ?? {}
  const value = cache[String(setId)]
  return value === undefined ? undefined : value
}

export function setFeaturedArtistCached(setId: number, isFeatured: boolean): void {
  const cache = { ...(store.get('featuredArtistCache') ?? {}) }
  cache[String(setId)] = isFeatured
  store.set('featuredArtistCache', cache)
}

export function getBeatmapSetOnlineCached(setId: number): boolean | undefined {
  const cache = store.get('beatmapSetOnlineCache') ?? {}
  const value = cache[String(setId)]
  return value === undefined ? undefined : value
}

export function setBeatmapSetOnlineCached(setId: number, online: boolean): void {
  const cache = { ...(store.get('beatmapSetOnlineCache') ?? {}) }
  cache[String(setId)] = online
  store.set('beatmapSetOnlineCache', cache)
}

export function getSourceSuggestionCached(
  cacheKey: string
): RankedSourceSuggestionResult | undefined {
  const cache = store.get('sourceSuggestionCache') ?? {}
  return cache[cacheKey]
}

export function setSourceSuggestionCached(
  cacheKey: string,
  result: RankedSourceSuggestionResult
): void {
  const cache = { ...(store.get('sourceSuggestionCache') ?? {}) }
  cache[cacheKey] = result
  store.set('sourceSuggestionCache', cache)
}
