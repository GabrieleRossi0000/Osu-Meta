import type { BeatmapMetadata } from './types'

/** Scripts that use a dedicated display vs romanized metadata pair in osu! */
const NON_LATIN_SCRIPT =
  /[\u3040-\u30ff\u31f0-\u31ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uac00-\ud7af\u1100-\u11ff\u3130-\u318f\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff\u0590-\u05ff\u0400-\u04ff\u0e00-\u0e7f\u0370-\u03ff]/

export interface RomanizedFieldLocks {
  artist: boolean
  title: boolean
}

/** True when the text is already Latin/romanized (no CJK, Arabic, Cyrillic, etc.). */
export function isAlreadyRomanized(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed) return true
  return !NON_LATIN_SCRIPT.test(trimmed)
}

export function getRomanizedFieldLocks(metadata: BeatmapMetadata): RomanizedFieldLocks {
  return {
    artist: isAlreadyRomanized(metadata.artistUnicode),
    title: isAlreadyRomanized(metadata.titleUnicode)
  }
}

export function applyRomanizedFieldLocks(
  metadata: BeatmapMetadata,
  locks: RomanizedFieldLocks
): BeatmapMetadata {
  return {
    ...metadata,
    artist: locks.artist ? metadata.artistUnicode : metadata.artist,
    title: locks.title ? metadata.titleUnicode : metadata.title
  }
}
