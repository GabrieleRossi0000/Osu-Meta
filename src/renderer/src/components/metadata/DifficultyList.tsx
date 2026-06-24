import { Box, Collapse, Group, Loader, Text, UnstyledButton } from '@mantine/core'
import { IconChevronRight } from '@tabler/icons-react'
import { useEffect, useMemo, useState } from 'react'
import type { BeatmapDifficultySummary } from '@shared/types'

interface DifficultyListProps {
  folderPath: string
  diffCount: number
}

export default function DifficultyList({
  folderPath,
  diffCount
}: DifficultyListProps): JSX.Element | null {
  const [open, setOpen] = useState(false)
  const [difficulties, setDifficulties] = useState<BeatmapDifficultySummary[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setOpen(false)
    setDifficulties([])
    setLoading(false)
  }, [folderPath])

  useEffect(() => {
    if (!open) return

    let cancelled = false
    setLoading(true)

    void window.api
      .loadDifficultySummaries(folderPath)
      .then((loaded) => {
        if (!cancelled) setDifficulties(loaded)
      })
      .catch(() => {
        if (!cancelled) setDifficulties([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, folderPath])

  const sorted = useMemo(
    () =>
      [...difficulties].sort(
        (a, b) => a.starRating - b.starRating || a.version.localeCompare(b.version)
      ),
    [difficulties]
  )

  if (diffCount === 0) return null

  return (
    <Box mt="sm">
      <UnstyledButton
        className={`mv-difficulties-toggle mv-chevron-btn${open ? ' mv-chevron-btn--open' : ''}`}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <Group gap={6} wrap="nowrap">
          <IconChevronRight size={16} stroke={2.75} className="mv-chevron-icon" />
          <Text size="sm" fw={600} className="mv-font-difficulties mv-difficulties-toggle-label">
            Difficulties ({diffCount})
          </Text>
          {open && loading ? <Loader size={14} /> : null}
        </Group>
      </UnstyledButton>

      <Collapse in={open} transitionDuration={220}>
        <Box mt={8} className="mv-diff-list" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {loading && sorted.length === 0 ? (
            <Text size="sm" c="dimmed">
              Calculating star ratings…
            </Text>
          ) : null}
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
                {diff.iconUrl ? (
                  <img
                    src={diff.iconUrl}
                    alt=""
                    width={28}
                    height={28}
                    style={{ objectFit: 'contain', display: 'block' }}
                    referrerPolicy="no-referrer"
                  />
                ) : null}
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
