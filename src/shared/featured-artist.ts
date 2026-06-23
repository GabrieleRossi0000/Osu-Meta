import { tagListIncludes } from './tags'

export const FEATURED_ARTIST_TAGS = ['featured', 'artist', 'fa'] as const

export const MAPPERS_GUILD_QUEST_TAGS = ['mappers', "mappers' guild", 'mpg', 'mg'] as const

export function hasFeaturedArtistTags(tags: string): boolean {
  return (
    tagListIncludes(tags, 'fa') &&
    tagListIncludes(tags, 'featured') &&
    tagListIncludes(tags, 'artist')
  )
}

export function getSuggestedMappersGuildQuestTags(
  tags: string,
  isFeaturedArtistMap = false
): string[] {
  if (!isFeaturedArtistMap && !hasFeaturedArtistTags(tags)) return []

  return MAPPERS_GUILD_QUEST_TAGS.filter((tag) => !tagListIncludes(tags, tag))
}

export function getSuggestedFeaturedArtistTags(
  tags: string,
  isFeaturedArtist: boolean
): string[] {
  if (!isFeaturedArtist) return []
  return FEATURED_ARTIST_TAGS.filter((tag) => !tagListIncludes(tags, tag))
}

export function hasPartialFeaturedArtistTags(tags: string): boolean {
  return (
    tagListIncludes(tags, 'fa') ||
    (tagListIncludes(tags, 'featured') && tagListIncludes(tags, 'artist'))
  )
}

export function getFeaturedArtistContext(isFeaturedArtist: boolean, tags: string): boolean {
  return isFeaturedArtist || hasPartialFeaturedArtistTags(tags)
}

export function isFaMissingGuildTags(tags: string): boolean {
  if (!hasPartialFeaturedArtistTags(tags)) return false
  return MAPPERS_GUILD_QUEST_TAGS.some((tag) => !tagListIncludes(tags, tag))
}
