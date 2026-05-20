import { Button, Group, Modal, Stack, Text, TextInput } from '@mantine/core'
import { IconDownload, IconFolder } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { modalClassNames, modalOverlayProps, modalTransitionProps } from '../../theme/modal'

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
  const [checkingUpdate, setCheckingUpdate] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [updateHint, setUpdateHint] = useState<string | null>(null)

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
      const path = await window.api.pickSongsFolder(folder || songsPath || undefined)
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
    <Modal
      opened={opened}
      onClose={onClose}
      title="Settings"
      size="md"
      centered
      classNames={modalClassNames}
      overlayProps={modalOverlayProps}
      transitionProps={modalTransitionProps}
    >
      <Stack gap="md" className="mv-modal-stagger">
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
        {error ? (
          <Text size="sm" c="red">
            {error}
          </Text>
        ) : null}

        <Stack gap="xs">
          <Text size="sm" fw={600}>
            Updates
          </Text>
          <Text size="xs" c="dimmed" lh={1.5}>
            On startup the app checks GitHub Releases. If a newer version exists, you can download
            the installer and update in place from the in-app prompt.
          </Text>
          <Button
            variant="light"
            leftSection={<IconDownload size={16} />}
            onClick={() => {
              setCheckingUpdate(true)
              setUpdateHint(null)
              void window.api
                .checkForUpdates()
                .catch((err) => {
                  setUpdateHint(err instanceof Error ? err.message : 'Update check failed.')
                })
                .finally(() => setCheckingUpdate(false))
            }}
            loading={checkingUpdate}
            w="fit-content"
          >
            Check for updates
          </Button>
          {updateHint ? (
            <Text size="sm" c="dimmed">
              {updateHint}
            </Text>
          ) : null}
        </Stack>

        <Group justify="flex-end" className="mv-modal-actions">
          <Button variant="default" onClick={onClose}>
            Close
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}
