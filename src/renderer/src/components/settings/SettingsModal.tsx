import { Alert, Button, Group, Modal, Stack, Text, TextInput } from '@mantine/core'
import { IconAlertTriangle, IconFolder } from '@tabler/icons-react'
import { useEffect, useState } from 'react'

interface SettingsModalProps {
  opened: boolean
  songsPath: string
  onClose: () => void
  onSongsPathChange: (path: string) => void
}

export default function SettingsModal({
  opened,
  songsPath,
  onClose,
  onSongsPathChange
}: SettingsModalProps): JSX.Element {
  const [folder, setFolder] = useState(songsPath)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (opened) {
      setFolder(songsPath)
      setError(null)
    }
  }, [opened, songsPath])

  const pickFolder = async (): Promise<void> => {
    setSaving(true)
    setError(null)
    try {
      const path = await window.api.pickSongsFolder()
      if (path) {
        setFolder(path)
        onSongsPathChange(path)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pick folder.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal opened={opened} onClose={onClose} title="Settings" size="md" centered>
      <Stack gap="md">
        <Alert icon={<IconAlertTriangle />} color="yellow" variant="light">
          Make sure the map is not open in the editor and that you&apos;re on song select before
          saving. <br />
          If the map is still open in the editor, osu! may overwrite your changes.
        </Alert>
        <TextInput label="Songs folder" value={folder} readOnly />
        <Button
          variant="light"
          leftSection={<IconFolder size={16} />}
          onClick={() => void pickFolder()}
          loading={saving}
          w="fit-content"
        >
          Browse…
        </Button>
        {error && (
          <Text size="sm" c="red">
            {error}
          </Text>
        )}
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Close
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}
