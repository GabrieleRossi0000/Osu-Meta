import type { ReactNode } from 'react'

interface BeatmapCardBadgePillProps {
  children: ReactNode
}

/** Frosted backdrop sized exactly to each card badge pill. */
export default function BeatmapCardBadgePill({ children }: BeatmapCardBadgePillProps): JSX.Element {
  return <span className="mv-beatmap-card-badge-pill">{children}</span>
}
