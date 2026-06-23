import { parseTagList, tagListIncludes } from './tags'

/** Language tags commonly used on osu! beatmaps. */
export const OSU_LANGUAGE_TAG_HINTS = [
  'english',
  'chinese',
  'french',
  'german',
  'italian',
  'japanese',
  'korean',
  'spanish',
  'swedish',
  'russian',
  'polish',
  'instrumental',
  'other'
] as const

/** Genre tags aligned with osu! genre categories and common tag usage. */
export const OSU_GENRE_TAG_HINTS = [
  'video game',
  'anime',
  'rock',
  'pop',
  'electronic',
  'metal',
  'classical',
  'folk',
  'jazz',
  'hip hop',
  'novelty',
  'other'
] as const

/** Common genre sub-tags on osu! (not official [General] genres). */
export const OSU_GENRE_SUBTAG_HINTS = [
  'jpop',
  'j-pop',
  'jrock',
  'j-rock',
  'kpop',
  'k-pop',
  'c-pop',
  'mandopop',
  'city pop',
  'citypop',
  'visual kei',
  'vocaloid',
  'doujin',
  'edm',
  'house',
  'trance',
  'dnb',
  'drum and bass',
  'techno',
  'indie',
  'punk',
  'post-rock',
  'prog',
  'progressive',
  'alternative',
  'r&b',
  'soul',
  'funk',
  'country',
  'blues',
  'reggae',
  'latin',
  'idm',
  'ambient',
  'dubstep',
  'breakcore',
  'hardcore',
  'hardstyle',
  'synthwave',
  'future bass',
  'bass house'
] as const

export type GenreLanguageTagSource = 'ranked_tags' | 'beatmap_page'

export interface GenreLanguageTagSuggestion {
  tag: string
  source: GenreLanguageTagSource
}

const SKIP_GENERAL_FIELD_VALUES = new Set(['', 'unspecified', 'any'])

/** Legacy numeric Genre values stored in .osu [General] sections. */
const OSU_FILE_GENRE_BY_ID: Record<number, (typeof OSU_GENRE_TAG_HINTS)[number]> = {
  1: 'video game',
  2: 'anime',
  3: 'rock',
  4: 'pop',
  5: 'other',
  6: 'novelty',
  7: 'hip hop',
  8: 'electronic',
  9: 'metal'
}

/** Legacy numeric Language values stored in .osu [General] sections. */
const OSU_FILE_LANGUAGE_BY_ID: Record<number, (typeof OSU_LANGUAGE_TAG_HINTS)[number]> = {
  1: 'english',
  2: 'japanese',
  3: 'chinese',
  4: 'instrumental',
  5: 'korean',
  6: 'french',
  7: 'german',
  8: 'swedish',
  9: 'spanish',
  10: 'italian',
  11: 'russian',
  12: 'polish',
  13: 'other'
}

function mapGeneralValueToTagHint(
  value: string,
  hints: readonly string[],
  legacyById: Record<number, (typeof hints)[number]>
): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  const normalized = trimmed.toLowerCase()
  if (SKIP_GENERAL_FIELD_VALUES.has(normalized)) return null

  const byName = hints.find((hint) => hint === normalized)
  if (byName) return byName

  const asNumber = Number.parseInt(trimmed, 10)
  if (Number.isFinite(asNumber) && legacyById[asNumber]) {
    return legacyById[asNumber]
  }

  return null
}

export function mapGeneralGenreToTag(genre: string): string | null {
  return mapGeneralValueToTagHint(genre, OSU_GENRE_TAG_HINTS, OSU_FILE_GENRE_BY_ID)
}

export function mapGeneralLanguageToTag(language: string): string | null {
  return mapGeneralValueToTagHint(language, OSU_LANGUAGE_TAG_HINTS, OSU_FILE_LANGUAGE_BY_ID)
}

function collectMatchingTagHints(tags: string, hints: readonly string[]): string[] {
  const found: string[] = []
  for (const hint of hints) {
    if (tagListIncludes(tags, hint)) found.push(hint)
  }
  return found
}

function normalizeGenreToken(tag: string): string {
  return tag.trim().toLowerCase().replace(/_/g, '-')
}

function isDerivedGenreSubtag(tag: string, baseGenre: string): boolean {
  const norm = normalizeGenreToken(tag)
  const base = normalizeGenreToken(baseGenre)
  if (!norm || norm === base) return false

  const compactBase = base.replace(/\s+/g, '')

  if (norm === `j-${base}` || norm === `j${compactBase}`) return true
  if (norm.endsWith(`-${compactBase}`) && norm.length > compactBase.length + 1) return true
  if (norm.startsWith(`${compactBase}-`) && norm.length > compactBase.length + 1) return true

  return false
}

/** Subgenre tags present on the ranked set, tied to official genres found there or on the page. */
export function collectGenreSubtagsFromRankedTags(
  rankedTags: string,
  anchorGenres: readonly string[]
): string[] {
  const rankedList = parseTagList(rankedTags)
  if (rankedList.length === 0) return []

  const officialGenreLower = new Set(OSU_GENRE_TAG_HINTS.map((hint) => hint.toLowerCase()))
  const subtagHintLower = new Set(OSU_GENRE_SUBTAG_HINTS.map((hint) => hint.toLowerCase()))
  const anchors = [...new Set(anchorGenres.map((genre) => genre.toLowerCase()).filter(Boolean))]
  const found: string[] = []
  const seen = new Set<string>()

  for (const tag of rankedList) {
    const norm = normalizeGenreToken(tag)
    if (!norm || officialGenreLower.has(norm) || seen.has(norm)) continue

    const inSubtagList = subtagHintLower.has(norm)
    const derived =
      anchors.length > 0 && anchors.some((anchor) => isDerivedGenreSubtag(tag, anchor))

    if (!inSubtagList && !derived) continue

    found.push(tag)
    seen.add(norm)
  }

  return found
}

export function extractGenreLanguageTagsFromTagString(tags: string): {
  genreTags: string[]
  languageTags: string[]
} {
  return {
    genreTags: collectMatchingTagHints(tags, OSU_GENRE_TAG_HINTS),
    languageTags: collectMatchingTagHints(tags, OSU_LANGUAGE_TAG_HINTS)
  }
}

export function missingGenreLanguageTags(
  currentTags: string,
  rankedTags: string
): { genreTags: string[]; languageTags: string[] } {
  const { genre, language } = buildGenreLanguageTagSuggestions(
    currentTags,
    rankedTags,
    '',
    ''
  )
  return {
    genreTags: genre.map((entry) => entry.tag),
    languageTags: language.map((entry) => entry.tag)
  }
}

/** Tags from ranked-set tag string plus beatmap-page Genre/Language when they differ. */
export function buildGenreLanguageTagSuggestions(
  currentTags: string,
  rankedTags: string,
  pageGenre: string,
  pageLanguage: string
): { genre: GenreLanguageTagSuggestion[]; language: GenreLanguageTagSuggestion[] } {
  const fromTags = extractGenreLanguageTagsFromTagString(rankedTags)
  const tagGenreLower = new Set(fromTags.genreTags.map((tag) => tag.toLowerCase()))
  const tagLanguageLower = new Set(fromTags.languageTags.map((tag) => tag.toLowerCase()))

  const genre: GenreLanguageTagSuggestion[] = fromTags.genreTags
    .map((tag) => ({
      tag: displayTagFromRankedSet(rankedTags, tag),
      source: 'ranked_tags' as const
    }))
    .filter(({ tag }) => !tagListIncludes(currentTags, tag))

  const pageGenreTag = mapGeneralGenreToTag(pageGenre)
  const anchorGenres = [...fromTags.genreTags]
  if (
    pageGenreTag &&
    !anchorGenres.some((genre) => genre.toLowerCase() === pageGenreTag.toLowerCase())
  ) {
    anchorGenres.push(pageGenreTag)
  }

  for (const subtag of collectGenreSubtagsFromRankedTags(rankedTags, anchorGenres)) {
    const tag = displayTagFromRankedSet(rankedTags, subtag)
    const tagLower = tag.toLowerCase()
    if (tagListIncludes(currentTags, tag)) continue
    if (genre.some((entry) => entry.tag.toLowerCase() === tagLower)) continue
    genre.push({ tag, source: 'ranked_tags' })
  }

  const language: GenreLanguageTagSuggestion[] = fromTags.languageTags
    .map((tag) => ({
      tag: displayTagFromRankedSet(rankedTags, tag),
      source: 'ranked_tags' as const
    }))
    .filter(({ tag }) => !tagListIncludes(currentTags, tag))

  if (
    pageGenreTag &&
    !tagGenreLower.has(pageGenreTag.toLowerCase()) &&
    !tagListIncludes(currentTags, pageGenreTag) &&
    !genre.some((entry) => entry.tag.toLowerCase() === pageGenreTag.toLowerCase())
  ) {
    genre.push({ tag: pageGenreTag, source: 'beatmap_page' })
  }

  const pageLanguageTag = mapGeneralLanguageToTag(pageLanguage)
  if (
    pageLanguageTag &&
    !tagLanguageLower.has(pageLanguageTag.toLowerCase()) &&
    !tagListIncludes(currentTags, pageLanguageTag) &&
    !language.some((entry) => entry.tag.toLowerCase() === pageLanguageTag.toLowerCase())
  ) {
    language.push({ tag: pageLanguageTag, source: 'beatmap_page' })
  }

  return { genre, language }
}

export function canLookupRankedGenreLanguageTags(
  artistUnicode: string,
  artist: string,
  titleUnicode: string,
  title: string
): boolean {
  return Boolean(
    (artistUnicode.trim() || artist.trim()) && (titleUnicode.trim() || title.trim())
  )
}

/** Preserve ranked-set tag casing when possible. */
export function displayTagFromRankedSet(rankedTags: string, hint: string): string {
  const lower = hint.toLowerCase()
  if (hint.includes(' ')) {
    const idx = rankedTags.toLowerCase().indexOf(lower)
    if (idx >= 0) return rankedTags.slice(idx, idx + hint.length)
    return hint
  }

  const match = parseTagList(rankedTags).find((tag) => tag.toLowerCase() === lower)
  return match ?? hint
}
