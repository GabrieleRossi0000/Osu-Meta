import { Box, Collapse, Group, Text, UnstyledButton } from '@mantine/core'
import { IconChevronRight } from '@tabler/icons-react'
import { useMemo, useState } from 'react'
import type { BeatmapDifficultySummary } from '@shared/types'

interface DifficultyListProps {
  difficulties: BeatmapDifficultySummary[]
}

export default function DifficultyList({ difficulties }: DifficultyListProps): JSX.Element | null {
  const [open, setOpen] = useState(true)

  const sorted = useMemo(
    () =>
      [...difficulties].sort(
        (a, b) => a.starRating - b.starRating || a.version.localeCompare(b.version)
      ),
    [difficulties]
  )

  if (sorted.length === 0) return null

  return (
    <Box mt="sm">
      <UnstyledButton
        className={`mv-chevron-btn${open ? ' mv-chevron-btn--open' : ''}`}
        onClick={() => setOpen((value) => !value)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          width: '100%',
          color: 'var(--mantine-color-dimmed)'
        }}
      >
        <IconChevronRight size={16} stroke={2.75} className="mv-chevron-icon" />
        <Text size="xs" c="dimmed" className="mv-font-difficulties">
          Difficulties ({sorted.length})
        </Text>
      </UnstyledButton>

      <Collapse in={open} transitionDuration={220}>
        <Box mt={8} className="mv-diff-list" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {sorted.map((diff) => (
            <Group key={diff.filename} gap="sm" wrap="nowrap" className="mv-diff-row">
              <Box
                w={28}
                h={28}
                style={{
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <img
                  src={diff.iconUrl}
                  alt=""
                  width={28}
                  height={28}
                  style={{ objectFit: 'contain', display: 'block' }}
                  referrerPolicy="no-referrer"
                />
              </Box>
              <Text size="sm" style={{ flex: 1, minWidth: 0 }} lineClamp={1}>
                {diff.version}
              </Text>
            </Group>
          ))}
        </Box>
      </Collapse>
    </Box>
  )
}
