import { ActionIcon, Popover, Stack, Text, Tooltip } from '@mantine/core'
import { IconKeyboard } from '@tabler/icons-react'

const SHORTCUTS = [
  { keys: 'Ctrl+S', description: 'Save metadata' },
  { keys: 'Ctrl+F', description: 'Focus beatmap search' },
  { keys: 'Ctrl+Shift+F', description: 'Fetch map selected in osu!' },
  { keys: '↑ / ↓', description: 'Previous / next mapset in list' }
] as const

export default function KeyboardShortcutsHelp(): JSX.Element {
  return (
    <Popover width={280} position="bottom-end" shadow="md" withArrow>
      <Popover.Target>
        <Tooltip label="Keyboard shortcuts">
          <ActionIcon variant="default" size="md" aria-label="Keyboard shortcuts">
            <IconKeyboard size={18} />
          </ActionIcon>
        </Tooltip>
      </Popover.Target>
      <Popover.Dropdown className="mv-shortcuts-popover">
        <Stack gap="xs" className="mv-stagger-children">
          <Text size="sm" fw={600}>
            Keyboard shortcuts
          </Text>
          {SHORTCUTS.map(({ keys, description }) => (
            <Text key={keys} size="sm" c="dimmed">
              <Text span fw={600} c="bright" className="mv-kbd">
                {keys}
              </Text>{' '}
              — {description}
            </Text>
          ))}
        </Stack>
      </Popover.Dropdown>
    </Popover>
  )
}
