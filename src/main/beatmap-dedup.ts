import type { BeatmapSetSummary } from '../shared/types'

export interface DedupCandidate {
  folderPath: string
  folderName: string
  displayName: string
  diffCount: number
  backgroundImageUrl: string | null
  beatmapSetId: number
  lastModifiedMs: number
  hasIdPrefix: boolean
}

function groupKey(candidate: DedupCandidate): string {
  if (candidate.beatmapSetId > 0) {
    return `set:${candidate.beatmapSetId}`
  }
  return `folder:${candidate.folderPath}`
}

function compareCandidates(a: DedupCandidate, b: DedupCandidate): number {
  if (a.hasIdPrefix !== b.hasIdPrefix) {
    return a.hasIdPrefix ? -1 : 1
  }
  return b.lastModifiedMs - a.lastModifiedMs
}

export function deduplicateBeatmapSets(candidates: DedupCandidate[]): BeatmapSetSummary[] {
  const groups = new Map<string, DedupCandidate[]>()

  for (const candidate of candidates) {
    const key = groupKey(candidate)
    const group = groups.get(key)
    if (group) {
      group.push(candidate)
    } else {
      groups.set(key, [candidate])
    }
  }

  const results: BeatmapSetSummary[] = []

  for (const group of groups.values()) {
    const sorted = [...group].sort(compareCandidates)
    const winner = sorted[0]
    const hiddenCount = sorted.length - 1

    results.push({
      folderPath: winner.folderPath,
      folderName: winner.folderName,
      displayName: winner.displayName,
      diffCount: winner.diffCount,
      backgroundImageUrl: winner.backgroundImageUrl,
      beatmapSetId: winner.beatmapSetId > 0 ? winner.beatmapSetId : null,
      lastModifiedAt: winner.lastModifiedMs,
      hiddenDuplicateCount: hiddenCount
    })
  }

  return results
}
