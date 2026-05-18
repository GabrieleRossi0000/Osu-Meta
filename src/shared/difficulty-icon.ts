const MODE_NAMES = ['std', 'taiko', 'ctb', 'mania'] as const

export function modeToGamemode(mode: number): string {
  return MODE_NAMES[mode] ?? 'std'
}

/** Icons use one decimal place, e.g. stars_5.2@2x.png */
export function formatStarRatingForIcon(stars: number): string {
  const clamped = Math.max(0, Math.min(10, stars))
  return clamped.toFixed(1)
}

export function difficultyIconUrl(mode: number, stars: number): string {
  const gamemode = modeToGamemode(mode)
  const sr = formatStarRatingForIcon(stars)
  return `https://raw.githubusercontent.com/hiderikzki/osu-difficulty-icons/main/rendered/${gamemode}/stars_${sr}@2x.png`
}
