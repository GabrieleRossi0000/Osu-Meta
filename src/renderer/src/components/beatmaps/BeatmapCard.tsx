import { Badge, Box, Flex, Group, Stack, Text, Tooltip } from '@mantine/core'
import { memo, useState } from 'react'
import { resolveBeatmapSetId } from '@shared/beatmap-set-id'
import type { BeatmapSetStatusEntry, BeatmapSetSummary } from '@shared/types'
import BeatmapSetStatusBadge from '../metadata/BeatmapSetStatusBadge'
import BeatmapCardBadgePill from './BeatmapCardBadgePill'
import { parseDisplayName } from '../../utils/parseDisplayName'

export type BeatmapCardVariant = 'sidebar' | 'picker'

interface BeatmapCardProps {
  beatmap: BeatmapSetSummary
  statusEntry?: BeatmapSetStatusEntry | null
  isSelected: boolean
  isHighlighted: boolean
  isDirty?: boolean
  variant?: BeatmapCardVariant
  onSelectFolder: (folderPath: string) => void
}

const PICKER_WIDTH = 172
const PICKER_HEIGHT = 120
const SIDEBAR_HEIGHT = 96

function BeatmapCard({
  beatmap,
  statusEntry = null,
  isSelected,
  isHighlighted,
  isDirty = false,
  variant = 'sidebar',
  onSelectFolder
}: BeatmapCardProps): JSX.Element {
  const [isHovered, setIsHovered] = useState(false)
  const bgUrl = beatmap.backgroundImageUrl ?? undefined
  const { artist, title } = parseDisplayName(beatmap.displayName, beatmap.folderName)
  const isPicker = variant === 'picker'
  const beatmapSetId = resolveBeatmapSetId(beatmap)
  const { flags } = beatmap
  const isFeaturedArtist = statusEntry?.isFeaturedArtist ?? false
  const showFaBadge = isFeaturedArtist || flags.faMissingGuild
  const faBadgeLabel = flags.faMissingGuild
    ? 'Featured artist — tags incomplete'
    : 'Featured artist'

  const transitionMs = '0.22s ease'
  const active = isSelected || isHovered

  const textStyle = {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    display: 'block',
    width: '100%',
    textAlign: 'center' as const,
    opacity: 0.9,
    textShadow:
      '0 1px 2px rgba(0, 0, 0, 0.62), 0 0 8px rgba(0, 0, 0, 0.28), 0 0 1px rgba(0, 0, 0, 0.55)'
  }

  const artistTitleStyle = { ...textStyle, lineHeight: 1.2 }

  return (
    <Flex
      className={[
        'mv-beatmap-card',
        isSelected ? 'mv-beatmap-card--selected' : '',
        isHighlighted ? 'mv-beatmap-card--highlighted' : ''
      ]
        .filter(Boolean)
        .join(' ')}
      w={isPicker ? PICKER_WIDTH : '100%'}
      h={isPicker ? PICKER_HEIGHT : SIDEBAR_HEIGHT}
      mx={isPicker ? 'auto' : undefined}
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 'var(--mv-radius-soft, var(--mantine-radius-lg))',
        position: 'relative',
        overflow: 'hidden',
        cursor: 'pointer',
        flexShrink: 0,
        border: 'none',
        boxShadow: isHighlighted
          ? '0 0 0 2px color-mix(in srgb, var(--mantine-color-teal-5) 70%, transparent), 0 8px 24px rgba(0, 0, 0, 0.35)'
          : active
            ? '0 0 0 1px color-mix(in srgb, var(--mantine-color-blue-6) 40%, transparent), 0 10px 28px rgba(0, 0, 0, 0.32)'
            : '0 2px 10px rgba(0, 0, 0, 0.18)',
        transition: `box-shadow ${transitionMs}`
      }}
      onClick={() => onSelectFolder(beatmap.folderPath)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Box
        style={{
          position: 'absolute',
          inset: 0,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          borderRadius: 'var(--mv-radius-soft, var(--mantine-radius-lg))',
          zIndex: 0,
          backgroundImage: bgUrl ? `url('${bgUrl}')` : 'none',
          backgroundColor: bgUrl ? undefined : 'var(--mantine-color-dark-6)',
          transform: active ? 'scale(1.045)' : 'scale(1)',
          transformOrigin: 'center center',
          transition: `transform ${transitionMs}`
        }}
      />
      {isDirty && !isPicker ? <Box className="mv-beatmap-card-dirty-dot" aria-hidden /> : null}
      {!isPicker ? (
        <Group
          gap={4}
          wrap="wrap"
          className="mv-beatmap-card-badge-bar"
          style={{ pointerEvents: 'none' }}
        >
          <BeatmapSetStatusBadge
            statusEntry={statusEntry}
            beatmapSetId={beatmapSetId}
            size="xs"
            surface="card"
          />
          {flags.mismatchedMetadata ? (
            <BeatmapCardBadgePill>
              <Tooltip label="Metadata differs between difficulties">
                <Badge size="xs" variant="filled" color="yellow">
                  Mismatch
                </Badge>
              </Tooltip>
            </BeatmapCardBadgePill>
          ) : null}
          {showFaBadge ? (
            <BeatmapCardBadgePill>
              <Tooltip label={faBadgeLabel}>
                <Badge size="xs" variant="filled" color="grape">
                  FA
                </Badge>
              </Tooltip>
            </BeatmapCardBadgePill>
          ) : null}
          {flags.hasValidationIssues ? (
            <BeatmapCardBadgePill>
              <Tooltip label="Validation issues in metadata">
                <Badge size="xs" variant="filled" color="red">
                  Issues
                </Badge>
              </Tooltip>
            </BeatmapCardBadgePill>
          ) : null}
        </Group>
      ) : null}
      <Box
        style={{
          position: 'absolute',
          inset: 0,
          background: active ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.6)',
          borderRadius: 'var(--mv-radius-soft, var(--mantine-radius-lg))',
          zIndex: 1,
          pointerEvents: 'none',
          transition: `background ${transitionMs}`
        }}
      />
      <Flex
        className={isPicker ? undefined : 'mv-beatmap-card__content'}
        direction="column"
        justify="center"
        align="center"
        gap={isPicker ? 6 : 0}
        p={isPicker ? 'sm' : 'xs'}
        w="100%"
        style={{
          position: 'relative',
          zIndex: 2,
          overflow: 'hidden',
          textAlign: 'center'
        }}
      >
        <Stack gap={isPicker ? 4 : 2} align="center" w="100%">
          <Stack gap={2} align="center" w="100%">
            <Text size={isPicker ? 'sm' : undefined} fw={isPicker ? 600 : undefined} style={artistTitleStyle}>
              {artist}
            </Text>
            {title ? (
              <Text size={isPicker ? 'sm' : undefined} fw={isPicker ? 500 : undefined} style={artistTitleStyle}>
                {title}
              </Text>
            ) : null}
          </Stack>
          {isPicker ? (
            <Text fs="italic" size="xs" style={textStyle}>
              {beatmap.diffCount} difficult{beatmap.diffCount === 1 ? 'y' : 'ies'}
            </Text>
          ) : null}
        </Stack>
      </Flex>
    </Flex>
  )
}

export default memo(BeatmapCard, (prev, next) => {
  return (
    prev.beatmap.folderPath === next.beatmap.folderPath &&
    prev.beatmap.displayName === next.beatmap.displayName &&
    prev.beatmap.diffCount === next.beatmap.diffCount &&
    prev.beatmap.backgroundImageUrl === next.beatmap.backgroundImageUrl &&
    prev.beatmap.hiddenDuplicateCount === next.beatmap.hiddenDuplicateCount &&
    prev.beatmap.flags === next.beatmap.flags &&
    prev.statusEntry === next.statusEntry &&
    prev.isSelected === next.isSelected &&
    prev.isHighlighted === next.isHighlighted &&
    prev.isDirty === next.isDirty &&
    prev.variant === next.variant &&
    prev.onSelectFolder === next.onSelectFolder
  )
})
