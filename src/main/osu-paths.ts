import { existsSync } from 'fs'
import { join } from 'path'
import type { DetectedPath } from '../shared/types'

export function getCandidateSongsPaths(): DetectedPath[] {
  const localAppData = process.env.LOCALAPPDATA
  if (!localAppData) {
    return []
  }

  const osuRoot = join(localAppData, 'osu!')
  const candidates: DetectedPath[] = [
    {
      label: 'osu!(stable)',
      path: join(osuRoot, 'Songs'),
      exists: false
    },
    {
      label: 'osu!(lazer)',
      path: join(osuRoot, 'storage', 'files', 'Songs'),
      exists: false
    }
  ]

  for (const candidate of candidates) {
    candidate.exists = existsSync(candidate.path)
  }

  return candidates
}

export function getFirstExistingSongsPath(): string | null {
  const candidates = getCandidateSongsPaths()
  const found = candidates.find((c) => c.exists)
  return found?.path ?? null
}
