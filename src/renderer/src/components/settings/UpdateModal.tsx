import {
  Alert,
  Badge,
  Button,
  Group,
  Loader,
  Modal,
  Stack,
  Text,
  ThemeIcon
} from '@mantine/core'
import {
  IconAlertTriangle,
  IconCircleCheck,
  IconDownload,
  IconExternalLink
} from '@tabler/icons-react'
import { useCallback, useEffect, useState } from 'react'
import type { UpdaterDialogAction, UpdaterDialogPayload } from '@shared/updater-dialog'
import { modalClassNames, modalOverlayProps, modalTransitionProps } from '../../theme/modal'

function dialogTitle(payload: UpdaterDialogPayload | null): string {
  if (!payload) return 'Updates'
  switch (payload.kind) {
    case 'available':
      return 'Update available'
    case 'up-to-date':
      return 'Up to date'
    case 'check-failed':
      return 'Update check failed'
    case 'install-failed':
      return 'Update failed'
    default:
      return 'Updates'
  }
}

export default function UpdateModal(): JSX.Element {
  const [dialog, setDialog] = useState<UpdaterDialogPayload | null>(null)
  const [installing, setInstalling] = useState(false)

  const respond = useCallback((action: UpdaterDialogAction): void => {
    setDialog(null)
    setInstalling(false)
    void window.api.respondToUpdaterDialog(action)
  }, [])

  useEffect(() => {
    const unsubDialog = window.api.onUpdaterDialog((payload) => {
      setInstalling(false)
      setDialog(payload)
    })
    const unsubInstalling = window.api.onUpdaterInstalling(() => {
      setInstalling(true)
    })
    return () => {
      unsubDialog()
      unsubInstalling()
    }
  }, [])

  const opened = dialog !== null
  const closeOnClickOutside = dialog?.kind !== 'available' || !installing

  return (
    <Modal
      opened={opened}
      onClose={() => {
        if (installing) return
        if (dialog?.kind === 'available') respond('later')
        else respond('dismiss')
      }}
      title={dialogTitle(dialog)}
      size="sm"
      centered
      closeOnClickOutside={closeOnClickOutside}
      closeOnEscape={!installing}
      withCloseButton={!installing}
      classNames={modalClassNames}
      overlayProps={modalOverlayProps}
      transitionProps={modalTransitionProps}
    >
      {dialog ? (
        <Stack gap="md" className="mv-modal-stagger mv-update-modal">
          {dialog.kind === 'available' ? (
            <>
              <Group gap="sm" wrap="wrap" className="mv-update-modal-versions">
                <Badge size="lg" variant="light" color="gray">
                  v{dialog.currentVersion}
                </Badge>
                <Text size="sm" c="dimmed" aria-hidden>
                  →
                </Text>
                <Badge size="lg" variant="light" color="teal">
                  v{dialog.latestVersion}
                </Badge>
              </Group>
              <Text size="sm" lh={1.55}>
                A new version of Osu Meta is ready. Download and install now to update in place —
                the app will restart when the installer finishes.
              </Text>
              {installing ? (
                <Alert
                  variant="light"
                  color="blue"
                  icon={<Loader size={18} />}
                  className="mv-update-modal-installing"
                >
                  <Text size="sm" fw={500}>
                    Downloading installer…
                  </Text>
                  <Text size="xs" c="dimmed" mt={4}>
                    This may take a moment. Osu Meta will close once installation starts.
                  </Text>
                </Alert>
              ) : null}
              <Group justify="flex-end" gap="sm" className="mv-modal-actions">
                <Button variant="default" onClick={() => respond('later')} disabled={installing}>
                  Later
                </Button>
                <Button
                  leftSection={<IconDownload size={16} />}
                  onClick={() => respond('install')}
                  loading={installing}
                  disabled={installing}
                >
                  Update now
                </Button>
              </Group>
            </>
          ) : null}

          {dialog.kind === 'up-to-date' ? (
            <>
              <Alert
                variant="light"
                color="green"
                icon={
                  <ThemeIcon size={32} radius="xl" variant="light" color="green">
                    <IconCircleCheck size={18} />
                  </ThemeIcon>
                }
              >
                <Text size="sm" fw={500}>
                  You are on the latest version.
                </Text>
                <Badge mt="xs" size="md" variant="light" color="gray">
                  v{dialog.currentVersion}
                </Badge>
              </Alert>
              <Group justify="flex-end" className="mv-modal-actions">
                <Button onClick={() => respond('dismiss')}>OK</Button>
              </Group>
            </>
          ) : null}

          {dialog.kind === 'check-failed' ? (
            <>
              <Alert
                variant="light"
                color="yellow"
                icon={<IconAlertTriangle size={18} />}
                className="mv-update-modal-error"
              >
                <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                  {dialog.message}
                </Text>
              </Alert>
              <Group justify="flex-end" gap="sm" className="mv-modal-actions">
                <Button
                  variant="light"
                  leftSection={<IconExternalLink size={16} />}
                  onClick={() => respond('open-releases')}
                >
                  Open releases
                </Button>
                <Button onClick={() => respond('dismiss')}>OK</Button>
              </Group>
            </>
          ) : null}

          {dialog.kind === 'install-failed' ? (
            <>
              <Alert
                variant="light"
                color="red"
                icon={<IconAlertTriangle size={18} />}
                className="mv-update-modal-error"
              >
                <Text size="sm" fw={500} mb={4}>
                  Could not download or run the installer.
                </Text>
                <Text size="sm" c="dimmed" style={{ whiteSpace: 'pre-wrap' }}>
                  {dialog.message}
                </Text>
              </Alert>
              <Group justify="flex-end" gap="sm" className="mv-modal-actions">
                <Button
                  variant="light"
                  leftSection={<IconExternalLink size={16} />}
                  onClick={() => respond('open-releases')}
                >
                  Open releases
                </Button>
                <Button onClick={() => respond('dismiss')}>OK</Button>
              </Group>
            </>
          ) : null}
        </Stack>
      ) : null}
    </Modal>
  )
}
