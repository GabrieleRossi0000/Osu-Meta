import { tagListIncludes } from './tags'

/** Matches guest difficulty names like "leledorf's expert". */
const GUEST_DIFFICULTY_PATTERN = /^(.+?)[''']s\s+\S/i

export function extractGuestMapperFromVersion(version: string): string | null {
  const trimmed = version.trim()
  if (!trimmed) return null

  const match = GUEST_DIFFICULTY_PATTERN.exec(trimmed)
  if (!match?.[1]) return null

  const name = match[1].trim()
  if (name.length < 2 || name.length > 40) return null
  return name
}

export function extractGuestMappersFromVersions(versions: string[]): string[] {
  const seen = new Set<string>()
  const mappers: string[] = []

  for (const version of versions) {
    const mapper = extractGuestMapperFromVersion(version)
    if (!mapper) continue

    const key = mapper.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    mappers.push(mapper)
  }

  return mappers
}

export function getSuggestedGuestMapperTags(
  versions: string[],
  tags: string,
  creator: string
): string[] {
  const creatorKey = creator.trim().toLowerCase()

  return extractGuestMappersFromVersions(versions).filter((mapper) => {
    if (creatorKey && mapper.toLowerCase() === creatorKey) return false
    return !tagListIncludes(tags, mapper)
  })
}
