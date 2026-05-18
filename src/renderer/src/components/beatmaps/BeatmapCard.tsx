import { Box, Flex, Stack, Text } from '@mantine/core'
import { useState } from 'react'
import type { BeatmapSetSummary } from '@shared/types'
import { parseDisplayName } from '../../utils/parseDisplayName'

export type BeatmapCardVariant = 'sidebar' | 'picker'

interface BeatmapCardProps {
  beatmap: BeatmapSetSummary
  isSelected: boolean
  isHighlighted: boolean
  variant?: BeatmapCardVariant
  onSelect: () => void
}

const PICKER_WIDTH = 172
const PICKER_HEIGHT = 120
const SIDEBAR_HEIGHT = 96

export default function BeatmapCard({
  beatmap,
  isSelected,
  isHighlighted,
  variant = 'sidebar',
  onSelect
}: BeatmapCardProps): JSX.Element {
  const [isHovered, setIsHovered] = useState(false)
  const bgUrl = beatmap.backgroundImageUrl ?? undefined
  const { artist, title } = parseDisplayName(beatmap.displayName, beatmap.folderName)
  const isPicker = variant === 'picker'

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
      className="mv-beatmap-card"
      w={isPicker ? PICKER_WIDTH : '100%'}
      h={isPicker ? PICKER_HEIGHT : SIDEBAR_HEIGHT}
      mx={isPicker ? 'auto' : undefined}
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 'var(--mantine-radius-md)',
        position: 'relative',
        overflow: 'hidden',
        cursor: 'pointer',
        flexShrink: 0,
        border: isHighlighted
          ? '2px solid var(--mantine-color-teal-5)'
          : active
            ? '1px solid var(--mantine-color-blue-6)'
            : '1px solid var(--mantine-color-dark-4)',
        boxShadow: isHighlighted
          ? '0 0 16px color-mix(in srgb, var(--mantine-color-teal-5) 45%, transparent)'
          : active
            ? '0 0 0 1px color-mix(in srgb, var(--mantine-color-blue-6) 35%, transparent), 0 8px 24px rgba(0, 0, 0, 0.35)'
            : '0 2px 8px rgba(0, 0, 0, 0.2)',
        transition: `border-color ${transitionMs}, box-shadow ${transitionMs}`
      }}
      onClick={onSelect}
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
          borderRadius: 'var(--mantine-radius-md)',
          zIndex: 0,
          backgroundImage: bgUrl ? `url('${bgUrl}')` : 'none',
          backgroundColor: bgUrl ? undefined : 'var(--mantine-color-dark-6)',
          transform: active ? 'scale(1.045)' : 'scale(1)',
          transformOrigin: 'center center',
          transition: `transform ${transitionMs}`
        }}
      />
      <Box
        style={{
          position: 'absolute',
          inset: 0,
          background: active ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.6)',
          borderRadius: 'var(--mantine-radius-md)',
          zIndex: 1,
          pointerEvents: 'none',
          transition: `background ${transitionMs}`
        }}
      />
      <Flex
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
        <Stack gap={isPicker ? 4 : 'sm'} align="center" w="100%">
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
          <Text fs="italic" size="xs" style={textStyle}>
            {beatmap.diffCount} difficult{beatmap.diffCount === 1 ? 'y' : 'ies'}
            {!isPicker && beatmap.hiddenDuplicateCount > 0
              ? ` · ${beatmap.hiddenDuplicateCount} older cop${beatmap.hiddenDuplicateCount === 1 ? 'y' : 'ies'} hidden`
              : ''}
          </Text>
        </Stack>
      </Flex>
    </Flex>
  )
}
