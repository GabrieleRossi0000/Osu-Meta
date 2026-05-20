export const LEADERBOARD_BEATMAPSET_STATUSES = ['ranked', 'loved', 'qualified'] as const

export type LeaderboardBeatmapsetStatus = (typeof LEADERBOARD_BEATMAPSET_STATUSES)[number]

const LEADERBOARD_STATUS_SET = new Set<string>(LEADERBOARD_BEATMAPSET_STATUSES)

export function isLeaderboardBeatmapsetStatus(status: string): boolean {
  return LEADERBOARD_STATUS_SET.has(status.toLowerCase())
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
    default:
      return 'gray'
  }
}

/** e.g. "Ranked 15 Jan 2025" — when the set entered its current leaderboard status. */
export function formatLeaderboardDateAt(status: string, dateAtMs: number): string | null {
  if (dateAtMs <= 0) return null
  const date = new Date(dateAtMs).toLocaleDateString(undefined, { dateStyle: 'medium' })
  return `${beatmapsetStatusLabel(status)} ${date}`
}
