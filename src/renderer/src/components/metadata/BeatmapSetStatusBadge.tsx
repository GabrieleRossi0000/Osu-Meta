import { Badge, Tooltip } from '@mantine/core'
import type { ReactNode } from 'react'
import {
  beatmapsetStatusClassName,
  beatmapsetStatusColor,
  beatmapsetStatusLabel
} from '@shared/osu-beatmap-status'
import type { BeatmapSetStatusEntry } from '@shared/types'
import BeatmapCardBadgePill from '../beatmaps/BeatmapCardBadgePill'

interface BeatmapSetStatusBadgeProps {
  statusEntry: BeatmapSetStatusEntry | null
  beatmapSetId: number | null
  size?: 'xs' | 'sm'
  /** Filled badges on beatmap cards for contrast over artwork */
  surface?: 'default' | 'card'
}

function wrapCardPill(node: ReactNode, surface: BeatmapSetStatusBadgeProps['surface']): JSX.Element | null {
  if (node == null) return null
  if (surface !== 'card') return node as JSX.Element
  return <BeatmapCardBadgePill>{node}</BeatmapCardBadgePill>
}

export default function BeatmapSetStatusBadge({
  statusEntry,
  beatmapSetId,
  size = 'sm',
  surface = 'default'
}: BeatmapSetStatusBadgeProps): JSX.Element | null {
  const variant = surface === 'card' ? 'filled' : 'light'
  if (beatmapSetId == null) {
    return wrapCardPill(
      <Badge size={size} variant={variant} color="gray">
        Local
      </Badge>,
      surface
    )
  }

  if (!statusEntry) {
    return wrapCardPill(
      <Badge size={size} variant={variant} color="gray">
        …
      </Badge>,
      surface
    )
  }

  if (!statusEntry.online) {
    return null
  }

  const status = statusEntry.status?.trim()
  if (!status) return null

  const statusClass = beatmapsetStatusClassName(status)

  return wrapCardPill(
    <Tooltip label={`Set #${beatmapSetId} on osu!`}>
      <Badge
        size={size}
        variant={variant}
        color={beatmapsetStatusColor(status)}
        className={statusClass}
      >
        {beatmapsetStatusLabel(status)}
      </Badge>
    </Tooltip>,
    surface
  )
}
