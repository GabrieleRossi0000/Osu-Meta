import { parseTagList, tagListIncludes } from './tags'

/** Normalize mapper names/tags for case- and punctuation-insensitive comparison. */
export function normalizeMapperName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function findEvidencedTagsForPreviousName(
  sourceTagLists: string[][],
  previousName: string
): string[] {
  const flatTags = sourceTagLists.flat()
  const normPrevious = normalizeMapperName(previousName)
  const previousWords = normPrevious.split(' ').filter((word) => word.length > 0)
  if (previousWords.length === 0 || flatTags.length === 0) return []

  for (const tag of flatTags) {
    if (normalizeMapperName(tag) === normPrevious) return [tag]
  }

  if (previousWords.length > 1) {
    for (const tagList of sourceTagLists) {
      for (let index = 0; index <= tagList.length - previousWords.length; index++) {
        const slice = tagList.slice(index, index + previousWords.length)
        if (slice.every((tag, wordIndex) => normalizeMapperName(tag) === previousWords[wordIndex])) {
          return slice
        }
      }
    }

    const matchedWords = previousWords.map((word) =>
      flatTags.find((tag) => normalizeMapperName(tag) === word)
    )
    if (matchedWords.every((tag): tag is string => typeof tag === 'string')) {
      return matchedWords
    }
  }

  if (previousWords.length === 1) {
    const tag = flatTags.find((entry) => normalizeMapperName(entry) === previousWords[0])
    if (tag) return [tag]
  }

  return []
}

/** Previous usernames evidenced on a mapper's latest ranked host set and/or guest set. */
export function suggestHistoricalUsernameTagEntries(
  previousUsernames: readonly string[],
  rankedSetTags: string | null | undefined,
  guestSetTags: string | null | undefined,
  currentTags: string
): Array<{ tag: string; previousUsername: string }> {
  const sourceTagLists = [rankedSetTags, guestSetTags]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .map((value) => parseTagList(value))

  if (sourceTagLists.length === 0 || previousUsernames.length === 0) return []

  const entries: Array<{ tag: string; previousUsername: string }> = []
  const seen = new Set<string>()

  for (const previous of previousUsernames) {
    for (const tag of findEvidencedTagsForPreviousName(sourceTagLists, previous)) {
      const key = normalizeMapperName(tag)
      if (!key || seen.has(key)) continue
      if (tagListIncludes(currentTags, tag)) continue
      seen.add(key)
      entries.push({ tag, previousUsername: previous })
    }
  }

  return entries
}

export function suggestHistoricalUsernameTags(
  previousUsernames: readonly string[],
  rankedSetTags: string | null | undefined,
  guestSetTags: string | null | undefined,
  currentTags: string
): string[] {
  return suggestHistoricalUsernameTagEntries(
    previousUsernames,
    rankedSetTags,
    guestSetTags,
    currentTags
  ).map((entry) => entry.tag)
}
