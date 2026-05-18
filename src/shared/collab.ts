import { tagListIncludes } from './tags'

/** e.g. "Name1 & Name2's Expert" or "Name1 and Name2's Hard" */
const COLLAB_DIFFICULTY_PATTERN =
  /^(.+?)\s+(?:&|and)\s+(.+?)[''']s\s+\S/i

export function extractCollabMappersFromVersion(version: string): string[] {
  const trimmed = version.trim()
  const match = COLLAB_DIFFICULTY_PATTERN.exec(trimmed)
  if (!match?.[1] || !match?.[2]) return []

  return [match[1].trim(), match[2].trim()].filter(
    (name) => name.length >= 2 && name.length <= 40
  )
}

export function extractCollabMappersFromVersions(versions: string[]): string[] {
  const seen = new Set<string>()
  const mappers: string[] = []

  for (const version of versions) {
    for (const mapper of extractCollabMappersFromVersion(version)) {
      const key = mapper.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      mappers.push(mapper)
    }
  }

  return mappers
}

export function getSuggestedCollabTags(
  versions: string[],
  tags: string,
  creator: string
): string[] {
  const creatorKey = creator.trim().toLowerCase()

  return extractCollabMappersFromVersions(versions).filter((mapper) => {
    if (creatorKey && mapper.toLowerCase() === creatorKey) return false
    return !tagListIncludes(tags, mapper)
  })
}
