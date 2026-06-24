import { useEffect, useRef, useState } from 'react'
import { resolveBeatmapSetId } from '@shared/beatmap-set-id'
import type { BeatmapSetStatusEntry, BeatmapSetSummary } from '@shared/types'

export function useBeatmapSetStatuses(
  beatmaps: BeatmapSetSummary[]
): Record<number, BeatmapSetStatusEntry> {
  const [statusBySetId, setStatusBySetId] = useState<Record<number, BeatmapSetStatusEntry>>({})
  const requestGenerationRef = useRef(0)

  useEffect(() => {
    const setIds = [
      ...new Set(
        beatmaps
          .map((beatmap) => resolveBeatmapSetId(beatmap))
          .filter((id): id is number => id != null && id > 0)
      )
    ]

    if (setIds.length === 0) {
      setStatusBySetId({})
      return
    }

    const generation = ++requestGenerationRef.current

    void window.api.resolveBeatmapSetStatuses(setIds).then((resolved) => {
      if (requestGenerationRef.current !== generation) return
      setStatusBySetId(resolved)
    })
  }, [beatmaps])

  return statusBySetId
}
