export const OSU_GAME_MODE_ORDER = ['osu', 'taiko', 'fruits', 'mania'] as const

export type OsuGameMode = (typeof OSU_GAME_MODE_ORDER)[number]

export function normalizeOsuGameMode(mode: string): OsuGameMode | null {
  const value = mode.trim().toLowerCase()
  if (value === 'osu' || value === 'taiko' || value === 'fruits' || value === 'mania') {
    return value
  }
  return null
}


export function extractOsuGameModes(beatmaps: { mode?: string }[] | undefined): OsuGameMode[] {
  if (!beatmaps?.length) return ['osu']

  const seen = new Set<OsuGameMode>()
  for (const beatmap of beatmaps) {
    const mode = beatmap.mode ? normalizeOsuGameMode(beatmap.mode) : null
    if (mode) seen.add(mode)
  }

  if (seen.size === 0) return ['osu']

  return OSU_GAME_MODE_ORDER.filter((mode) => seen.has(mode))
}

export function beatmapGameModeLabel(mode: OsuGameMode | string): string {
  switch (mode.toLowerCase()) {
    case 'osu':
      return 'osu!'
    case 'taiko':
      return 'Taiko'
    case 'fruits':
      return 'Catch'
    case 'mania':
      return 'Mania'
    default:
      return mode
  }
}
