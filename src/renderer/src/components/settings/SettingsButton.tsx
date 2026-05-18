import { NavLink } from '@mantine/core'
import { IconSettings } from '@tabler/icons-react'
import { useState } from 'react'
import SettingsModal from './SettingsModal'

interface SettingsButtonProps {
  songsPath: string
  onSongsPathChange: (path: string) => void
}

export default function SettingsButton({
  songsPath,
  onSongsPathChange
}: SettingsButtonProps): JSX.Element {
  const [opened, setOpened] = useState(false)

  return (
    <>
      <NavLink
        ml="auto"
        w="unset"
        label={<IconSettings />}
        onClick={() => setOpened(true)}
        styles={{
          root: {
            borderRadius: '100%',
            justifyContent: 'center',
            paddingLeft: 8,
            paddingRight: 8
          },
          label: { width: '100%', display: 'flex', justifyContent: 'center' }
        }}
      />
      <SettingsModal
        opened={opened}
        songsPath={songsPath}
        onClose={() => setOpened(false)}
        onSongsPathChange={onSongsPathChange}
      />
    </>
  )
}
