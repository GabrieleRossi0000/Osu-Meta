import { beatmapSetPageUrl } from '../shared/beatmap-set-id'
import { openExternalUrl } from './open-external-url'

export async function openBeatmapPage(beatmapSetId: unknown): Promise<void> {
  const id = Math.trunc(Number(beatmapSetId))
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error('This beatmap set is not on osu! yet.')
  }

  await openExternalUrl(beatmapSetPageUrl(id))
}
