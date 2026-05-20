import { Center, Paper, Stack, Text, useMantineTheme } from '@mantine/core'
import { IconMusic } from '@tabler/icons-react'

export default function NoBeatmapSelected({
  loading
}: {
  loading?: boolean
}): JSX.Element {
  const theme = useMantineTheme()

  return (
    <Center h="100%" mih={320} className="mv-content-enter">
      <Paper p="xl" radius="lg" bg={theme.colors.dark[5]} maw={440} className="mv-paper-surface">
        <Stack align="center" gap="md">
          <IconMusic
            className="mv-empty-state-icon"
            size={52}
            stroke={1.2}
            color={theme.colors.primary[3]}
          />
          <Stack gap={6} align="center">
            <Text fw={600} size="md" ta="center">
              {loading ? 'Loading…' : 'No mapset selected'}
            </Text>
            <Text c="dimmed" size="sm" ta="center" lh={1.55}>
              {loading
                ? 'Reading metadata from disk.'
                : 'Choose a beatmap from the sidebar, or press Ctrl+Shift+F to fetch the map selected in osu!.'}
            </Text>
            {!loading ? (
              <Text c="dimmed" size="xs" ta="center" lh={1.5}>
                Ctrl+F focuses search · ↑/↓ moves between mapsets
              </Text>
            ) : null}
          </Stack>
        </Stack>
      </Paper>
    </Center>
  )
}
