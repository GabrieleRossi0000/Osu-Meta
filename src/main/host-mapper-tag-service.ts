import {
  normalizeMapperName,
  suggestHistoricalUsernameTagEntries
} from '../shared/guest-mapper-historical-tags'
import type { SetOwnerAlternateTagSuggestion } from '../shared/types'
import {
  fetchBeatmapsetExtended,
  fetchUserLatestBeatmapsetTagContext,
  fetchUserProfile,
  isOsuApiConfigured
} from './osu-api-client'

export async function suggestHostAlternateNameTags(
  beatmapSetId: number
): Promise<SetOwnerAlternateTagSuggestion[]> {
  if (!isOsuApiConfigured() || beatmapSetId <= 0) return []

  const beatmapset = await fetchBeatmapsetExtended(beatmapSetId)
  if (!beatmapset || beatmapset.userId <= 0) return []

  const profile = await fetchUserProfile(beatmapset.userId)
  if (!profile) return []

  const previousUsernames = profile.previousUsernames.filter(
    (name) => normalizeMapperName(name) !== normalizeMapperName(profile.username)
  )
  if (previousUsernames.length === 0) return []

  const guestContext = await fetchUserLatestBeatmapsetTagContext(beatmapset.userId, 'guest')
  if (!guestContext) return []

  return suggestHistoricalUsernameTagEntries(
    previousUsernames,
    null,
    guestContext.tags,
    ''
  ).map((entry) => ({
    previousUsername: entry.previousUsername,
    tag: entry.tag,
    sourceBeatmapSetId: guestContext.beatmapSetId
  }))
}
