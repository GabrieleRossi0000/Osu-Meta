import type { BeatmapComboColour } from './types'

export function clamp255(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(255, Math.round(n)))
}

export function beatmapComboColourFromRgb(r: number, g: number, b: number): BeatmapComboColour {
  return { r: clamp255(r), g: clamp255(g), b: clamp255(b) }
}

export function comboColoursEqual(a: BeatmapComboColour[], b: BeatmapComboColour[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i].r !== b[i].r || a[i].g !== b[i].g || a[i].b !== b[i].b) return false
  }
  return true
}

/** osu! `[Colours]` value: `232,175,245` or `232, 175, 245` */
export function parseOsuRgbValue(value: string): BeatmapComboColour | null {
  const m = value.trim().match(/^(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})$/)
  if (!m) return null
  return beatmapComboColourFromRgb(Number(m[1]), Number(m[2]), Number(m[3]))
}

export function parseHexColor(input: string): BeatmapComboColour | null {
  let s = input.trim()
  if (!s.startsWith('#')) s = `#${s}`
  const m = /^#([0-9a-fA-F]{6})$/.exec(s)
  if (!m) return null
  const hex = m[1]
  return beatmapComboColourFromRgb(
    Number.parseInt(hex.slice(0, 2), 16),
    Number.parseInt(hex.slice(2, 4), 16),
    Number.parseInt(hex.slice(4, 6), 16)
  )
}

export function rgbTupleToHex(c: BeatmapComboColour): string {
  const t = (n: number) => clamp255(n).toString(16).padStart(2, '0')
  return `#${t(c.r)}${t(c.g)}${t(c.b)}`
}

export function formatOsuComboLine(index1Based: number, c: BeatmapComboColour): string {
  return `Combo${index1Based} : ${c.r},${c.g},${c.b}`
}
