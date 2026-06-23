/** Canonical order: featured artist fa mappers mappers' guild mpg mg */
export const ORDERED_META_TAGS = [
  'featured',
  'artist',
  'fa',
  'mappers',
  "mappers' guild",
  'mpg',
  'mg'
] as const

export function parseTagList(tags: string): string[] {
  return tags
    .trim()
    .split(/\s+/)
    .filter((tag) => tag.length > 0)
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function removeTagFromString(tags: string, tag: string): string {
  const needle = tag.trim()
  if (!needle) return tags

  if (needle.includes(' ')) {
    return tags
      .replace(new RegExp(`\\s*${escapeRegex(needle)}\\s*`, 'gi'), ' ')
      .trim()
      .replace(/\s{2,}/g, ' ')
  }

  return parseTagList(tags)
    .filter((entry) => entry.toLowerCase() !== needle.toLowerCase())
    .join(' ')
}

export function tagListIncludes(tags: string, tag: string): boolean {
  const needle = tag.trim().toLowerCase()
  if (!needle) return true

  if (needle.includes(' ')) {
    return tags.toLowerCase().includes(needle)
  }

  return parseTagList(tags).some((entry) => entry.toLowerCase() === needle)
}

/**
 * Keeps FA / mappers' guild tags together in canonical order; other tags stay before that block.
 */
export function applyOrderedMetaTags(tags: string): string {
  let remaining = tags.trim()
  const present = new Set<string>()

  for (const meta of ORDERED_META_TAGS) {
    if (tagListIncludes(remaining, meta)) {
      present.add(meta.toLowerCase())
      remaining = removeTagFromString(remaining, meta)
    }
  }

  const metaBlock = ORDERED_META_TAGS.filter((meta) => present.has(meta.toLowerCase()))
  const others = parseTagList(remaining)

  if (metaBlock.length === 0) return others.join(' ')
  if (others.length === 0) return metaBlock.join(' ')
  return `${metaBlock.join(' ')} ${others.join(' ')}`
}

export function addTag(tags: string, tag: string): string {
  const value = tag.trim()
  if (!value) return applyOrderedMetaTags(tags)
  if (tagListIncludes(tags, value)) return applyOrderedMetaTags(tags)

  const trimmed = tags.trim()
  const next = trimmed.length === 0 ? value : `${trimmed} ${value}`
  return applyOrderedMetaTags(next)
}

export function addTags(tags: string, toAdd: string[]): string {
  return applyOrderedMetaTags(toAdd.reduce((current, tag) => addTag(current, tag), tags))
}

export function removeTagAtIndex(tags: string, index: number): string {
  const list = parseTagList(tags)
  if (index < 0 || index >= list.length) return tags
  list.splice(index, 1)
  return applyOrderedMetaTags(list.join(' '))
}

export function removeTagByValue(tags: string, tag: string): string {
  return applyOrderedMetaTags(removeTagFromString(tags, tag))
}

export interface ArtistTitleTagOccurrence {
  tag: string
  index: number
}

function normalizeTagMatchValue(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const MIN_METADATA_WORD_LEN = 2
const MIN_METADATA_COPY_SEQUENCE_LEN = 2

/** Conjunctions allowed alone, but flagged when copied as part of artist/title/source. */
const METADATA_CONJUNCTION_WORDS = new Set([
  'a',
  'an',
  'and',
  'or',
  'the',
  'of',
  'in',
  'on',
  'at',
  'to',
  'for',
  'with',
  'by',
  'from',
  'as',
  'but',
  'nor',
  'so',
  'yet',
  'vs'
])

/** osu! edition marker tag; allowed even when title/artist contain the same words. */
const GAME_VER_TAG = 'game ver'

function isGameVerTag(tag: string): boolean {
  return normalizeTagMatchValue(tag) === GAME_VER_TAG
}

function metadataFullStringValues(
  artistUnicode: string,
  artist: string,
  titleUnicode: string,
  title: string,
  source: string
): Set<string> {
  const values = new Set<string>()

  for (const value of [artistUnicode, artist, titleUnicode, title, source]) {
    const normalized = normalizeTagMatchValue(value)
    if (normalized) values.add(normalized)
  }

  return values
}

function metadataStandaloneWordValues(
  artistUnicode: string,
  artist: string,
  titleUnicode: string,
  title: string,
  source: string
): Set<string> {
  const values = new Set<string>()

  for (const value of [artistUnicode, artist, titleUnicode, title, source]) {
    const normalized = normalizeTagMatchValue(value)
    if (!normalized) continue

    for (const word of normalized.split(' ')) {
      if (word.length < MIN_METADATA_WORD_LEN) continue
      if (METADATA_CONJUNCTION_WORDS.has(word)) continue
      values.add(word)
    }
  }

  return values
}

function metadataWordLists(
  artistUnicode: string,
  artist: string,
  titleUnicode: string,
  title: string,
  source: string
): string[][] {
  const lists: string[][] = []

  for (const value of [artistUnicode, artist, titleUnicode, title, source]) {
    const normalized = normalizeTagMatchValue(value)
    if (!normalized) continue

    const words = normalized.split(' ').filter((word) => word.length > 0)
    if (words.length >= MIN_METADATA_COPY_SEQUENCE_LEN) lists.push(words)
  }

  return lists
}

function findContiguousMetadataCopyIndices(
  normalizedTags: string[],
  metadataWordLists: string[][]
): Set<number> {
  const indices = new Set<number>()

  for (const metadataWords of metadataWordLists) {
    for (let tagStart = 0; tagStart < normalizedTags.length; tagStart++) {
      for (let metaStart = 0; metaStart < metadataWords.length; metaStart++) {
        let matchLen = 0
        while (
          tagStart + matchLen < normalizedTags.length &&
          metaStart + matchLen < metadataWords.length &&
          normalizedTags[tagStart + matchLen] === metadataWords[metaStart + matchLen]
        ) {
          matchLen++
        }

        if (matchLen >= MIN_METADATA_COPY_SEQUENCE_LEN) {
          for (let index = tagStart; index < tagStart + matchLen; index++) {
            indices.add(index)
          }
        }
      }
    }
  }

  return indices
}

function tagSliceMatchesMetadata(
  slice: string[],
  metadataWords: string[],
  metaStart: number
): boolean {
  if (slice.length < MIN_METADATA_COPY_SEQUENCE_LEN) return false
  if (metaStart + slice.length > metadataWords.length) return false

  for (let offset = 0; offset < slice.length; offset++) {
    if (slice[offset] !== metadataWords[metaStart + offset]) return false
  }

  return true
}

function tagSliceMatchesAnyMetadata(slice: string[], metadataWordLists: string[][]): boolean {
  if (slice.length < MIN_METADATA_COPY_SEQUENCE_LEN) return false

  for (const metadataWords of metadataWordLists) {
    for (let metaStart = 0; metaStart < metadataWords.length; metaStart++) {
      if (tagSliceMatchesMetadata(slice, metadataWords, metaStart)) return true
    }
  }

  return false
}

/**
 * Album / search tags often share a word with the song title (e.g. title "no filter", tags "no antidote").
 * Skip standalone-word flags when this tag sits in a 2+ tag run that does not copy artist/title/source.
 */
function isInIndependentMultiTagPhrase(
  normalizedTags: string[],
  index: number,
  metadataWordLists: string[][]
): boolean {
  const maxPhraseLen = 6

  for (let start = 0; start <= index; start++) {
    const maxEnd = Math.min(normalizedTags.length, start + maxPhraseLen)
    for (let end = start + MIN_METADATA_COPY_SEQUENCE_LEN; end <= maxEnd; end++) {
      if (index < start || index >= end) continue
      const slice = normalizedTags.slice(start, end)
      if (!tagSliceMatchesAnyMetadata(slice, metadataWordLists)) return true
    }
  }

  return false
}

function getMetadataTagViolationIndices(
  tags: string,
  artistUnicode: string,
  artist: string,
  titleUnicode: string,
  title: string,
  source: string
): Set<number> {
  const list = parseTagList(tags)
  if (list.length === 0) return new Set()

  const normalizedTags = list.map((tag) => normalizeTagMatchValue(tag))
  const fullStrings = metadataFullStringValues(artistUnicode, artist, titleUnicode, title, source)
  const standaloneWords = metadataStandaloneWordValues(
    artistUnicode,
    artist,
    titleUnicode,
    title,
    source
  )
  const wordLists = metadataWordLists(artistUnicode, artist, titleUnicode, title, source)
  const copyIndices = findContiguousMetadataCopyIndices(normalizedTags, wordLists)

  const violating = new Set<number>()

  for (let index = 0; index < list.length; index++) {
    if (isGameVerTag(list[index]!)) continue

    const normalized = normalizedTags[index]!
    if (!normalized) continue

    if (fullStrings.has(normalized) || standaloneWords.has(normalized)) {
      if (
        standaloneWords.has(normalized) &&
        isInIndependentMultiTagPhrase(normalizedTags, index, wordLists)
      ) {
        continue
      }
      violating.add(index)
      continue
    }

    if (copyIndices.has(index) && METADATA_CONJUNCTION_WORDS.has(normalized)) {
      violating.add(index)
    }
  }

  return violating
}

export function getArtistTitleTagOccurrences(
  tags: string,
  artistUnicode: string,
  artist: string,
  titleUnicode: string,
  title: string,
  source: string
): ArtistTitleTagOccurrence[] {
  const list = parseTagList(tags)
  const violating = getMetadataTagViolationIndices(
    tags,
    artistUnicode,
    artist,
    titleUnicode,
    title,
    source
  )
  if (violating.size === 0) return []

  const occurrences: ArtistTitleTagOccurrence[] = []
  for (const index of [...violating].sort((a, b) => a - b)) {
    occurrences.push({ tag: list[index]!, index })
  }

  return occurrences
}

export function hasArtistTitleTags(
  tags: string,
  artistUnicode: string,
  artist: string,
  titleUnicode: string,
  title: string,
  source: string
): boolean {
  return getArtistTitleTagOccurrences(tags, artistUnicode, artist, titleUnicode, title, source).length > 0
}

export function removeArtistTitleTags(
  tags: string,
  artistUnicode: string,
  artist: string,
  titleUnicode: string,
  title: string,
  source: string
): string {
  const occurrences = getArtistTitleTagOccurrences(tags, artistUnicode, artist, titleUnicode, title, source)
  const indices = occurrences
    .map(({ index }) => index)
    .sort((a, b) => b - a)

  let next = tags
  for (const index of indices) {
    next = removeTagAtIndex(next, index)
  }

  return next
}
