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

/** osu! edition marker tag; allowed even when title/artist contain the same words. */
const GAME_VER_TAG = 'game ver'

function isGameVerTag(tag: string): boolean {
  return normalizeTagMatchValue(tag) === GAME_VER_TAG
}

function distinctMetadataPhrases(values: string[]): string[] {
  const seen = new Set<string>()
  const phrases: string[] = []

  for (const value of values) {
    const trimmed = value.trim()
    if (!trimmed) continue
    const normalized = normalizeTagMatchValue(trimmed)
    if (!normalized || seen.has(normalized)) continue
    seen.add(normalized)
    phrases.push(trimmed)
  }

  return phrases
}

/** Indices of tags that form a complete copy of the given metadata phrase. */
function indicesForFullPhraseInTags(tags: string, phrase: string): number[] {
  const list = parseTagList(tags)
  if (list.length === 0) return []

  const normalizedPhrase = normalizeTagMatchValue(phrase)
  if (!normalizedPhrase) return []

  const phraseWords = normalizedPhrase.split(' ').filter((word) => word.length > 0)
  const normalizedTags = list.map((tag, index) => ({
    index,
    normalized: normalizeTagMatchValue(tag)
  }))

  const indices = new Set<number>()

  for (const { index, normalized } of normalizedTags) {
    if (!normalized || isGameVerTag(list[index]!)) continue
    if (normalized === normalizedPhrase) indices.add(index)
  }

  if (phraseWords.length > 1) {
    const tagWords = normalizedTags.map((entry) => entry.normalized)
    for (let start = 0; start <= tagWords.length - phraseWords.length; start++) {
      let matches = true
      for (let offset = 0; offset < phraseWords.length; offset++) {
        if (tagWords[start + offset] !== phraseWords[offset]) {
          matches = false
          break
        }
      }
      if (!matches) continue
      for (let offset = 0; offset < phraseWords.length; offset++) {
        const index = normalizedTags[start + offset]!.index
        if (!isGameVerTag(list[index]!)) indices.add(index)
      }
    }
  }

  return [...indices].sort((a, b) => a - b)
}

export function tagsContainFullPhrase(tags: string, phrase: string): boolean {
  return indicesForFullPhraseInTags(tags, phrase).length > 0
}

export type FullMetadataInTagsField = 'artist' | 'title' | 'source'

export interface FullMetadataInTagsViolation {
  field: FullMetadataInTagsField
  matchedPhrase: string
}

export function getFullMetadataInTagsViolations(
  tags: string,
  artistUnicode: string,
  artist: string,
  titleUnicode: string,
  title: string,
  source: string
): FullMetadataInTagsViolation[] {
  const violations: FullMetadataInTagsViolation[] = []
  const seenFields = new Set<FullMetadataInTagsField>()

  const checks: Array<{ field: FullMetadataInTagsField; phrases: string[] }> = [
    { field: 'artist', phrases: distinctMetadataPhrases([artistUnicode, artist]) },
    { field: 'title', phrases: distinctMetadataPhrases([titleUnicode, title]) },
    { field: 'source', phrases: distinctMetadataPhrases([source]) }
  ]

  for (const { field, phrases } of checks) {
    if (seenFields.has(field)) continue
    for (const phrase of phrases) {
      if (tagsContainFullPhrase(tags, phrase)) {
        violations.push({ field, matchedPhrase: phrase })
        seenFields.add(field)
        break
      }
    }
  }

  return violations
}

function getMetadataTagViolationIndices(
  tags: string,
  artistUnicode: string,
  artist: string,
  titleUnicode: string,
  title: string,
  source: string
): Set<number> {
  const indices = new Set<number>()

  for (const phrases of [
    distinctMetadataPhrases([artistUnicode, artist]),
    distinctMetadataPhrases([titleUnicode, title]),
    distinctMetadataPhrases([source])
  ]) {
    for (const phrase of phrases) {
      for (const index of indicesForFullPhraseInTags(tags, phrase)) {
        indices.add(index)
      }
    }
  }

  return indices
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
