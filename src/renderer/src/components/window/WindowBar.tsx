import { ActionIcon, Badge, Box, Group, Tooltip, useMantineColorScheme, useMantineTheme } from '@mantine/core'
import { IconMinus, IconSquare, IconX } from '@tabler/icons-react'
import { useEffect, useState, type CSSProperties } from 'react'
import { WINDOW_BAR_HEIGHT, WINDOWS_TITLE_BAR_OVERLAY } from '@shared/window-chrome'
import logoUrl from '../../assets/logo.png'

const dragStyle = { WebkitAppRegion: 'drag' } as CSSProperties
const noDragStyle = { WebkitAppRegion: 'no-drag' } as CSSProperties

interface WindowBarProps {
  osuRunning?: boolean
}

export default function WindowBar({ osuRunning = false }: WindowBarProps): JSX.Element {
  const theme = useMantineTheme()
  const { colorScheme } = useMantineColorScheme()
  const isDark = colorScheme === 'dark'
  const bgColor = isDark ? theme.colors.dark[8] : theme.colors.gray[0]
  const textColor = theme.colors.primary[2]
  const barHeight = WINDOW_BAR_HEIGHT
  const logoHeight = 44
  const isDev = import.meta.env.DEV
  const usesNativeWindowControls = window.api.usesNativeWindowControls

  const [version, setVersion] = useState('')

  useEffect(() => {
    void window.api.getAppVersion().then(setVersion).catch(() => setVersion(''))
  }, [])

  useEffect(() => {
    if (!usesNativeWindowControls) return
    const overlay = isDark ? WINDOWS_TITLE_BAR_OVERLAY.dark : WINDOWS_TITLE_BAR_OVERLAY.light
    void window.api.setTitleBarOverlay({
      ...overlay,
      height: barHeight
    })
  }, [usesNativeWindowControls, isDark, barHeight])

  const barStyle: CSSProperties = {
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
    boxShadow: '0 8px 24px -12px rgba(0, 0, 0, 0.45)',
    ...(usesNativeWindowControls ? noDragStyle : dragStyle)
  }

  return (
    <Group
      gap={0}
      style={barStyle}
      pl={theme.spacing.sm}
      justify="flex-end"
    >
      <Group
        gap={8}
        align="center"
        wrap="nowrap"
        style={
          {
            ...(usesNativeWindowControls ? dragStyle : noDragStyle),
            flex: 1,
            minWidth: 0,
            paddingRight: usesNativeWindowControls ? 'env(titlebar-area-width, 138px)' : undefined
          } as CSSProperties
        }
      >
        <img
          src={logoUrl}
          alt="OsuMeta"
          className="mv-logo mv-logo-interactive"
          draggable={false}
          style={{
            ...dragStyle,
            ['--mv-logo-height' as string]: `${logoHeight}px`
          }}
        />
        <Tooltip label={osuRunning ? 'osu! is running' : 'osu! is not running'}>
          <Box
            className={osuRunning ? 'mv-osu-dot mv-osu-dot--live' : 'mv-osu-dot'}
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
      {!usesNativeWindowControls ? (
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
            className="mv-window-close"
            aria-label="Close"
            onClick={() => window.api.window.close()}
            style={{ ...noDragStyle, height: '100%', width: 36, borderRadius: 0 }}
          >
            <IconX size={20} color={theme.colors.red[6]} />
          </ActionIcon>
        </div>
      ) : null}
    </Group>
  )
}
