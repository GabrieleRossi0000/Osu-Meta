import { ActionIcon, Badge, Box, Group, Tooltip, useMantineColorScheme, useMantineTheme } from '@mantine/core'
import { IconMinus, IconSquare, IconX } from '@tabler/icons-react'
import { useEffect, useState, type CSSProperties } from 'react'
import logoUrl from '../../assets/logo.png'

const dragStyle = { WebkitAppRegion: 'drag' } as CSSProperties
const noDragStyle = { WebkitAppRegion: 'no-drag' } as CSSProperties

export default function WindowBar(): JSX.Element {
  const theme = useMantineTheme()
  const { colorScheme } = useMantineColorScheme()
  const isDark = colorScheme === 'dark'
  const bgColor = isDark ? theme.colors.dark[8] : theme.colors.gray[0]
  const textColor = theme.colors.primary[2]
  const barHeight = 48
  const logoHeight = 44
  const isDev = import.meta.env.DEV

  const [version, setVersion] = useState('')
  const [osuRunning, setOsuRunning] = useState(false)

  useEffect(() => {
    void window.api.getAppVersion().then(setVersion).catch(() => setVersion(''))
  }, [])

  useEffect(() => {
    const poll = (): void => {
      void window.api.isOsuRunning().then(setOsuRunning)
    }
    poll()
    const interval = setInterval(poll, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <Group
      gap={0}
      style={{
        ...dragStyle,
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        zIndex: 2000,
        height: barHeight,
        background: bgColor,
        color: textColor,
        alignItems: 'center',
        userSelect: 'none',
        borderBottom: `1px solid ${theme.colors.dark[4]}`
      }}
      pl={theme.spacing.sm}
      justify="flex-end"
    >
      <Group
        gap={8}
        align="center"
        wrap="nowrap"
        style={{ ...dragStyle, flex: 1, minWidth: 0 } as CSSProperties}
      >
        <img
          src={logoUrl}
          alt="OsuMeta"
          draggable={false}
          style={{
            ...dragStyle,
            display: 'block',
            height: logoHeight,
            width: 'auto',
            objectFit: 'contain',
            flexShrink: 0
          }}
        />
        <Tooltip label={osuRunning ? 'osu! is running' : 'osu! is not running'}>
          <Box
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              flexShrink: 0,
              backgroundColor: osuRunning ? theme.colors.green[5] : theme.colors.gray[6],
              boxShadow: osuRunning ? `0 0 6px ${theme.colors.green[5]}` : 'none'
            }}
          />
        </Tooltip>
        {version ? (
          <span
            style={{
              ...dragStyle,
              fontSize: 11,
              opacity: 0.65,
              color: textColor,
              flexShrink: 0
            }}
          >
            {version}
          </span>
        ) : null}
        {isDev ? (
          <Badge color="red" size="xs" radius="sm" variant="filled" style={{ flexShrink: 0, opacity: 0.85 }}>
            DEV
          </Badge>
        ) : null}
      </Group>
      <div
        style={{
          ...noDragStyle,
          display: 'flex',
          alignSelf: 'stretch',
          height: '100%',
          gap: 0
        }}
      >
        <ActionIcon
          variant="subtle"
          color={isDark ? 'gray' : 'dark'}
          aria-label="Minimize"
          onClick={() => window.api.window.minimize()}
          style={{ ...noDragStyle, height: '100%', width: 36, borderRadius: 0 }}
        >
          <IconMinus size={20} color={textColor} />
        </ActionIcon>
        <ActionIcon
          variant="subtle"
          color={isDark ? 'gray' : 'dark'}
          aria-label="Maximize"
          onClick={() => window.api.window.toggleMaximize()}
          style={{ ...noDragStyle, height: '100%', width: 36, borderRadius: 0 }}
        >
          <IconSquare size={14} color={textColor} />
        </ActionIcon>
        <ActionIcon
          variant="subtle"
          color="red"
          aria-label="Close"
          onClick={() => window.api.window.close()}
          style={{ ...noDragStyle, height: '100%', width: 36, borderRadius: 0 }}
        >
          <IconX size={20} color={theme.colors.red[6]} />
        </ActionIcon>
      </div>
    </Group>
  )
}

