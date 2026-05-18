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

export interface DuplicateTagOccurrence {
  tag: string
  index: number
}

export function getDuplicateTagOccurrences(tags: string): DuplicateTagOccurrence[] {
  const list = parseTagList(tags)
  const seen = new Map<string, number>()
  const duplicates: DuplicateTagOccurrence[] = []

  for (let index = 0; index < list.length; index++) {
    const tag = list[index]
    const key = tag.toLowerCase()
    const count = seen.get(key) ?? 0
    seen.set(key, count + 1)
    if (count >= 1) {
      duplicates.push({ tag, index })
    }
  }

  return duplicates
}

export function hasDuplicateTags(tags: string): boolean {
  return getDuplicateTagOccurrences(tags).length > 0
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
