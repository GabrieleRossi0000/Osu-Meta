import Store from 'electron-store'
import type { AppSettings, ScanCache, TagSectionsExpanded } from '../shared/types'

const DEFAULT_TAG_SECTIONS: TagSectionsExpanded = {
  featured: true,
  source: true,
  guest: true,
  guild: true,
  collab: true,
  wrongTags: true
}

const store = new Store<AppSettings>({
  name: 'osu-meta-settings',
  defaults: {
    songsPath: null,
    ignoredDuplicateFolders: [],
    tagSectionsExpanded: DEFAULT_TAG_SECTIONS,
    dismissedWrongTagHints: {},
    scanCache: null,
    sidebarWidth: 256,
    featuredArtistCache: {},
    beatmapSetOnlineCache: {}
  }
})

export function getSettings(): AppSettings {
  return {
    songsPath: store.get('songsPath'),
    ignoredDuplicateFolders: store.get('ignoredDuplicateFolders') ?? [],
    tagSectionsExpanded: store.get('tagSectionsExpanded') ?? DEFAULT_TAG_SECTIONS,
    dismissedWrongTagHints: store.get('dismissedWrongTagHints') ?? {},
    scanCache: store.get('scanCache') ?? null,
    sidebarWidth: store.get('sidebarWidth') ?? 256,
    featuredArtistCache: store.get('featuredArtistCache') ?? {},
    beatmapSetOnlineCache: store.get('beatmapSetOnlineCache') ?? {}
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

export function setIgnoredDuplicateFolders(folderPaths: string[]): void {
  store.set('ignoredDuplicateFolders', folderPaths)
}

export function isDuplicateWarningIgnored(folderPath: string): boolean {
  const list = store.get('ignoredDuplicateFolders') ?? []
  return list.some((entry) => entry.toLowerCase() === folderPath.toLowerCase())
}

export function setDuplicateWarningIgnored(folderPath: string, ignored: boolean): void {
  const list = store.get('ignoredDuplicateFolders') ?? []
  const key = folderPath.toLowerCase()
  const next = ignored
    ? list.some((entry) => entry.toLowerCase() === key)
      ? list
      : [...list, folderPath]
    : list.filter((entry) => entry.toLowerCase() !== key)
  store.set('ignoredDuplicateFolders', next)
}

export function getTagSectionsExpanded(): TagSectionsExpanded {
  return store.get('tagSectionsExpanded') ?? DEFAULT_TAG_SECTIONS
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
