import {
  normalizeMapperName,
  suggestHistoricalUsernameTags
} from '../shared/guest-mapper-historical-tags'
import type { GuestMapperTagSuggestion } from '../shared/types'
import type { BeatmapsetExtendedInfo } from './osu-api-client'
import {
  fetchBeatmapsetExtended,
  fetchUserLatestBeatmapsetTags,
  fetchUserProfile,
  isOsuApiConfigured
} from './osu-api-client'

function collectGuestMappers(beatmapset: BeatmapsetExtendedInfo): Map<number, string> {
  const guestMappers = new Map<number, string>()
  const hostId = beatmapset.userId

  for (const beatmap of beatmapset.beatmaps) {
    if (beatmap.owners.length > 0) {
      for (const owner of beatmap.owners) {
        if (owner.id === hostId || guestMappers.has(owner.id)) continue
        guestMappers.set(owner.id, owner.username)
      }
      continue
    }

    if (beatmap.userId <= 0 || beatmap.userId === hostId || guestMappers.has(beatmap.userId)) {
      continue
    }

    guestMappers.set(beatmap.userId, `user ${beatmap.userId}`)
  }

  return guestMappers
}

export async function suggestGuestMapperApiTags(
  beatmapSetId: number
): Promise<GuestMapperTagSuggestion[]> {
  if (!isOsuApiConfigured() || beatmapSetId <= 0) return []

  const beatmapset = await fetchBeatmapsetExtended(beatmapSetId)
  if (!beatmapset) return []

  const guestMappers = collectGuestMappers(beatmapset)
  if (guestMappers.size === 0) return []

  const suggestions: GuestMapperTagSuggestion[] = []
  const seenTags = new Set<string>()

  const pushSuggestion = (suggestion: GuestMapperTagSuggestion): void => {
    const key = suggestion.tag.trim().toLowerCase()
    if (!key || seenTags.has(key)) return
    seenTags.add(key)
    suggestions.push(suggestion)
  }

  for (const [userId, mapperUsername] of guestMappers) {
    const profile = await fetchUserProfile(userId)
    const username = profile?.username ?? mapperUsername

    for (const tag of currentUsernameTags(username)) {
      pushSuggestion({
        mapperUsername: username,
        tag,
        kind: 'current'
      })
    }

    if (!profile) continue

    const previousUsernames = profile.previousUsernames.filter(
      (name) => normalizeMapperName(name) !== normalizeMapperName(username)
    )
    if (previousUsernames.length === 0) continue

    const [rankedSetTags, guestSetTags] = await Promise.all([
      fetchUserLatestBeatmapsetTags(userId, 'ranked'),
      fetchUserLatestBeatmapsetTags(userId, 'guest')
    ])

    for (const tag of suggestHistoricalUsernameTags(
      previousUsernames,
      rankedSetTags,
      guestSetTags,
      ''
    )) {
      pushSuggestion({
        mapperUsername: username,
        tag,
        kind: 'previous'
      })
    }
  }

  return suggestions
}

function currentUsernameTags(username: string): string[] {
  const trimmed = username.trim()
  if (!trimmed) return []
  if (!trimmed.includes(' ')) return [trimmed]
  return trimmed.split(/\s+/).filter((part) => part.length > 0)
}
