import { calculateDifficulty, getRulesetById } from '@kionell/osu-pp-calculator'
import { BeatmapDecoder } from 'osu-parsers'
import { basename } from 'path'
import { difficultyIconUrl } from '../shared/difficulty-icon'
import type { BeatmapDifficultySummary } from '../shared/types'
import { decodeOsuFile, readOsuFileBuffer } from './osu-file'

const beatmapDecoder = new BeatmapDecoder()

function readField(text: string, field: string): string {
  const match = new RegExp(`^${field}:\\s*(.+)$`, 'm').exec(text)
  return match?.[1]?.trim() ?? ''
}

function calculateStarRating(text: string, mode: number): number {
  if (mode < 0 || mode > 3) return 0

  try {
    const normalized = text.replace(/\r\n/g, '\n')
    const beatmap = beatmapDecoder.decodeFromString(normalized)
    const ruleset = getRulesetById(mode)
    const result = calculateDifficulty({ beatmap, ruleset, mods: 'NM' })
    const stars = Number(result.starRating)
    return Number.isFinite(stars) ? stars : 0
  } catch {
    return 0
  }
}

export function readDifficultySummaryFromText(
  text: string,
  filename: string
): BeatmapDifficultySummary {

  const mode = Number.parseInt(readField(text, 'Mode') || '0', 10)
  const version = readField(text, 'Version') || filename
  const starRating = calculateStarRating(text, mode)

  return {
    version,
    mode,
    starRating,
    iconUrl: difficultyIconUrl(mode, starRating),
    filename
  }
}

export function readDifficultySummary(filePath: string): BeatmapDifficultySummary {
  const buffer = readOsuFileBuffer(filePath)
  const { text } = decodeOsuFile(buffer)
  return readDifficultySummaryFromText(text, basename(filePath))
}
