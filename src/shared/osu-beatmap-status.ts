export const LEADERBOARD_BEATMAPSET_STATUSES = ['ranked', 'loved', 'qualified'] as const

export type LeaderboardBeatmapsetStatus = (typeof LEADERBOARD_BEATMAPSET_STATUSES)[number]

/** Ranked queue + ranked — used when copying tags/source/genre from osu! reference sets. */
export const METADATA_SUGGESTION_BEATMAPSET_STATUSES = ['ranked', 'approved', 'qualified'] as const

const LEADERBOARD_STATUS_SET = new Set<string>(LEADERBOARD_BEATMAPSET_STATUSES)
const METADATA_SUGGESTION_STATUS_SET = new Set<string>(METADATA_SUGGESTION_BEATMAPSET_STATUSES)

export function isLeaderboardBeatmapsetStatus(status: string): boolean {
  return LEADERBOARD_STATUS_SET.has(status.toLowerCase())
}

export function isMetadataSuggestionBeatmapsetStatus(status: string): boolean {
  return METADATA_SUGGESTION_STATUS_SET.has(status.toLowerCase())
}

export function beatmapsetStatusLabel(status: string): string {
  switch (status.toLowerCase()) {
    case 'ranked':
    case 'approved':
      return 'Ranked'
    case 'loved':
      return 'Loved'
    case 'qualified':
      return 'Qualified'
    case 'pending':
      return 'Pending'
    case 'graveyard':
      return 'Graveyard'
    case 'wip':
      return 'WIP'
    case 'notsubmitted':
      return 'Not submitted'
    default:
      return status
  }
}

export function beatmapsetStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'ranked':
    case 'approved':
      return 'green'
    case 'loved':
      return 'pink'
    case 'qualified':
      return 'blue'
    case 'pending':
      return 'yellow'
    case 'graveyard':
      return 'dark'
    case 'wip':
      return 'orange'
    default:
      return 'gray'
  }
}

/** Optional class for status-specific badge styling (WIP vs pending, graveyard tone, etc.). */
export function beatmapsetStatusClassName(status: string): string | undefined {
  switch (status.toLowerCase()) {
    case 'wip':
      return 'mv-status-badge--wip'
    case 'pending':
      return 'mv-status-badge--pending'
    case 'graveyard':
      return 'mv-status-badge--graveyard'
    default:
      return undefined
  }
}

/** e.g. "Ranked 15 Jan 2025" — when the set entered its current leaderboard status. */
export function formatLeaderboardDateAt(status: string, dateAtMs: number): string | null {
  if (dateAtMs <= 0) return null
  const date = new Date(dateAtMs).toLocaleDateString(undefined, { dateStyle: 'medium' })
  return `${beatmapsetStatusLabel(status)} ${date}`
}
