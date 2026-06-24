import {
  Alert,
  AppShell,
  Burger,
  Button,
  Center,
  Container,
  CSSVariablesResolver,
  Group,
  Loader,
  MantineProvider,
  Modal,
  Paper,
  ScrollArea,
  Stack,
  Text,
  useMantineTheme
} from '@mantine/core'
import { IconAlertTriangle } from '@tabler/icons-react'
import { useDebouncedValue, useDisclosure, useMediaQuery } from '@mantine/hooks'
import { Notifications } from '@mantine/notifications'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { filterBeatmaps } from '@shared/filter-beatmaps'
import { matchBeatmapByDisplayTitle } from '@shared/match-display-name'
import type { BeatmapSetSummary, DetectedPath } from '@shared/types'
import BeatmapsSidebar from './components/beatmaps/BeatmapsSidebar'
import SidebarResizeHandle from './components/beatmaps/SidebarResizeHandle'
import KeyboardShortcutsHelp from './components/common/KeyboardShortcutsHelp'
import NoBeatmapSelected from './components/common/NoBeatmapSelected'
import BeatmapWorkspace, { type BeatmapWorkspaceHandle } from './components/metadata/BeatmapWorkspace'
import SettingsButton from './components/settings/SettingsButton'
import UpToDatePill from './components/common/UpToDatePill'
import UpdateModal from './components/settings/UpdateModal'
import WindowBar from './components/window/WindowBar'
import WindowResizeHandles from './components/window/WindowResizeHandles'
import logoUrl from './assets/logo.png'
import { theme } from './theme/Theme'
import { modalClassNames, modalOverlayProps, modalTransitionProps } from './theme/modal'

const appModalProps = {
  centered: true,
  classNames: modalClassNames,
  overlayProps: modalOverlayProps,
  transitionProps: modalTransitionProps
} as const
import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'
import './theme/global.scss'
import './theme/motion.scss'

const cssVarResolver: CSSVariablesResolver = () => ({
  variables: {},
  light: {},
  dark: {
    '--mantine-color-text': '#fff',
    '--mantine-color-dimmed': '#9e9e9e'
  }
})

function SetupScreen({ onReady }: { onReady: (path: string) => void }): JSX.Element {
  const theme = useMantineTheme()
  const [detected, setDetected] = useState<DetectedPath[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void window.api.detectSongsPaths().then(setDetected)
  }, [])

  const useDetected = async (): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      const path = await window.api.getDefaultSongsPath()
      if (!path) {
        setError('No osu! Songs folder was found. Choose a folder manually.')
        return
      }
      await window.api.setSongsPath(path)
      onReady(path)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set Songs folder.')
    } finally {
      setLoading(false)
    }
  }

  const pickFolder = async (): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      const path = await window.api.pickSongsFolder()
      if (path) onReady(path)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pick Songs folder.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Center h="100vh" p="md" style={{ paddingTop: 'var(--mv-window-bar-height)' }}>
      <Paper p="xl" radius="lg" bg={theme.colors.dark[6]} maw={520} w="100%" className="mv-paper-surface mv-content-enter">
        <Stack gap="md" align="center">
          <img src={logoUrl} alt="OsuMeta" className="mv-logo" style={{ ['--mv-logo-height' as string]: '52px' }} />
          <Text c="dimmed" size="sm">
            Select your osu! <strong>Songs</strong> folder. The app lists beatmap sets and updates
            metadata across all difficulties at once.
          </Text>
          <Stack gap="xs">
            {detected.map((item) => (
              <Paper key={item.path} p="sm" radius="sm" bg={theme.colors.dark[5]}>
                <Text size="sm" c={item.exists ? 'green' : 'dimmed'} fw={500}>
                  {item.exists ? 'Found' : 'Not found'} — {item.label}
                </Text>
                <Text size="xs" c="dimmed" style={{ wordBreak: 'break-all' }}>
                  {item.path}
                </Text>
              </Paper>
            ))}
          </Stack>
          {error && (
            <Text size="sm" c="red">
              {error}
            </Text>
          )}
          <Group>
            <Button onClick={() => void useDetected()} loading={loading}>
              Use detected folder
            </Button>
            <Button variant="default" onClick={() => void pickFolder()} loading={loading}>
              Choose folder…
            </Button>
          </Group>
        </Stack>
      </Paper>
    </Center>
  )
}

function MainScreen({
  songsPath,
  onSongsPathChange,
  osuRunning
}: {
  songsPath: string
  onSongsPathChange: (path: string) => void
  osuRunning: boolean
}): JSX.Element {
  const theme = useMantineTheme()
  const isNavbarMobile = useMediaQuery(`(max-width: ${theme.breakpoints.xs})`, false, {
    getInitialValueInEffect: false
  })
  const [navbarOpened, { toggle: toggleNavbar, close: closeNavbar, open: openNavbar }] =
    useDisclosure(true)
  const [beatmaps, setBeatmaps] = useState<BeatmapSetSummary[]>([])
  const [selected, setSelected] = useState<BeatmapSetSummary | null>(null)
  const [editorDirty, setEditorDirty] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(256)
  const [highlightedFolderPath, setHighlightedFolderPath] = useState<string | null>(null)
  const [showUnsavedSwitch, setShowUnsavedSwitch] = useState(false)
  const [showUnsavedClose, setShowUnsavedClose] = useState(false)
  const [pendingSelect, setPendingSelect] = useState<BeatmapSetSummary | null>(null)
  const [loadingList, setLoadingList] = useState(true)
  const [listSearch, setListSearch] = useState('')
  const [fetchingCurrent, setFetchingCurrent] = useState(false)
  const [fetchNotice, setFetchNotice] = useState<string | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const workspaceRef = useRef<BeatmapWorkspaceHandle>(null)

  const [debouncedListSearch] = useDebouncedValue(listSearch, 200)
  const filteredBeatmaps = useMemo(
    () => filterBeatmaps(beatmaps, debouncedListSearch),
    [beatmaps, debouncedListSearch]
  )

  const dirtyFolderPath = editorDirty ? (selected?.folderPath ?? null) : null

  const loadBeatmaps = useCallback(async (force = false): Promise<BeatmapSetSummary[]> => {
    setLoadingList(true)
    try {
      const sets = await window.api.scanBeatmaps(force)
      setBeatmaps(sets)
      return sets
    } catch {
      return []
    } finally {
      setLoadingList(false)
    }
  }, [])

  useEffect(() => {
    void loadBeatmaps()
  }, [loadBeatmaps, songsPath])

  useEffect(() => {
    void window.api.getSettings().then((settings) => {
      setSidebarWidth(settings.sidebarWidth)
    })
  }, [])

  useEffect(() => {
    if (!isNavbarMobile) return
    if (selected) closeNavbar()
    else openNavbar()
  }, [isNavbarMobile, selected?.folderPath, closeNavbar, openNavbar])

  useEffect(() => {
    void window.api.setCloseBlocked(editorDirty)
  }, [editorDirty])

  useEffect(() => {
    return window.api.onRequestCloseConfirm(() => {
      if (editorDirty) setShowUnsavedClose(true)
      else void window.api.confirmAppClose()
    })
  }, [editorDirty])

  const selectBeatmap = useCallback(
    (set: BeatmapSetSummary): void => {
      setSelected(set)
      if (isNavbarMobile) closeNavbar()
    },
    [closeNavbar, isNavbarMobile]
  )

  const trySelectBeatmap = useCallback(
    (set: BeatmapSetSummary): void => {
      if (editorDirty) {
        setPendingSelect(set)
        setShowUnsavedSwitch(true)
        return
      }
      selectBeatmap(set)
    },
    [editorDirty, selectBeatmap]
  )

  const saveAndSwitch = useCallback((): void => {
    if (!selected || !pendingSelect) return
    setShowUnsavedSwitch(false)
    workspaceRef.current?.saveForNavigation({ switchTo: pendingSelect })
  }, [selected, pendingSelect])

  const saveAndClose = useCallback((): void => {
    setShowUnsavedClose(false)
    workspaceRef.current?.saveForNavigation({ closeAfter: true })
  }, [])

  const handleSidebarWidthCommit = useCallback((width: number): void => {
    void window.api.setSidebarWidth(width)
  }, [])

  const fetchCurrentMap = useCallback(async (): Promise<void> => {
    setFetchingCurrent(true)
    setFetchNotice(null)
    try {
      const result = await window.api.lookupCurrentBeatmap(beatmaps)

      const selectFound = (found: BeatmapSetSummary): void => {
        setHighlightedFolderPath(found.folderPath)
        window.setTimeout(() => setHighlightedFolderPath(null), 2500)
        if (selected?.folderPath === found.folderPath) {
          setFetchNotice(null)
          return
        }
        trySelectBeatmap(found)
        setFetchNotice(null)
      }

      const selectByFolder = (folderPath: string): boolean => {
        const found = beatmaps.find(
          (b) => b.folderPath.toLowerCase() === folderPath.toLowerCase()
        )
        if (!found) return false
        selectFound(found)
        return true
      }

      if (result.status === 'folder_found' && result.folderPath) {
        if (selectByFolder(result.folderPath)) return
        setFetchNotice(
          `Found "${result.metadataFilename ?? 'map'}" in osu!, but it is not in your scanned Songs list.`
        )
        return
      }

      if (result.displayTitle) {
        const found = matchBeatmapByDisplayTitle(beatmaps, result.displayTitle)
        if (found) {
          selectFound(found)
          return
        }
        setFetchNotice(
          `osu! shows "${result.displayTitle}", but no matching map was found in your Songs list.`
        )
        return
      }

      setFetchNotice(result.message)
    } catch (err) {
      setFetchNotice(err instanceof Error ? err.message : 'Failed to detect current map.')
    } finally {
      setFetchingCurrent(false)
    }
  }, [beatmaps, selected, trySelectBeatmap])

  const moveListSelection = useCallback(
    (direction: -1 | 1): void => {
      if (filteredBeatmaps.length === 0) return
      const currentIndex = selected
        ? filteredBeatmaps.findIndex((b) => b.folderPath === selected.folderPath)
        : -1
      let nextIndex =
        currentIndex < 0
          ? direction > 0
            ? 0
            : filteredBeatmaps.length - 1
          : currentIndex + direction
      if (nextIndex < 0) nextIndex = filteredBeatmaps.length - 1
      if (nextIndex >= filteredBeatmaps.length) nextIndex = 0
      trySelectBeatmap(filteredBeatmaps[nextIndex])
    },
    [filteredBeatmaps, selected, trySelectBeatmap]
  )

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const target = event.target
      const inField =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable)

      if (event.ctrlKey && event.key.toLowerCase() === 's') {
        event.preventDefault()
        workspaceRef.current?.requestSave()
        return
      }

      if (event.ctrlKey && event.key.toLowerCase() === 'f') {
        event.preventDefault()
        if (event.shiftKey) {
          void fetchCurrentMap()
          return
        }
        searchInputRef.current?.focus()
        searchInputRef.current?.select()
        return
      }

      if (inField) return

      if (event.key === 'ArrowDown') {
        event.preventDefault()
        moveListSelection(1)
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        moveListSelection(-1)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [moveListSelection, fetchCurrentMap])

  const discardUnsavedAndContinue = (): void => {
    setShowUnsavedSwitch(false)
    if (pendingSelect) {
      selectBeatmap(pendingSelect)
      setPendingSelect(null)
    }
  }

  const handleNavigateTo = useCallback((set: BeatmapSetSummary): void => {
    setPendingSelect(null)
    selectBeatmap(set)
  }, [selectBeatmap])

  return (
    <>
      <AppShell
        className="mv-app-shell"
        header={{ height: 92 }}
        navbar={{
          width: sidebarWidth,
          breakpoint: 'xs',
          collapsed: { mobile: !navbarOpened, desktop: !navbarOpened }
        }}
        padding={0}
      >
        <AppShell.Header
          className="mv-app-header"
          style={{
            marginTop: 'var(--mv-window-bar-height)',
            height: 60,
            fontFamily: theme.headings.fontFamily,
            viewTransitionName: 'app-header'
          }}
        >
          <Group h={60} px="md" wrap="nowrap">
            <Burger opened={navbarOpened} onClick={toggleNavbar} size="sm" />
            <Text fw={600} size="sm" style={{ flex: 1, minWidth: 0 }}>
              Beatmap list
            </Text>
            <KeyboardShortcutsHelp />
            <SettingsButton songsPath={songsPath} onSongsPathChange={onSongsPathChange} />
          </Group>
        </AppShell.Header>

        <AppShell.Navbar style={{ viewTransitionName: 'app-sidebar' }}>
          <div className="mv-sidebar-shell">
            <BeatmapsSidebar
            filteredBeatmaps={filteredBeatmaps}
            totalBeatmapCount={beatmaps.length}
            loading={loadingList}
            songsConfigured={Boolean(songsPath)}
            selectedFolderPath={selected?.folderPath ?? null}
            highlightedFolderPath={highlightedFolderPath}
            dirtyFolderPath={dirtyFolderPath}
            search={listSearch}
            onSearchChange={setListSearch}
            searchInputRef={searchInputRef}
            onSelect={trySelectBeatmap}
            onRefresh={(force) => void loadBeatmaps(force)}
            onFetchCurrent={() => void fetchCurrentMap()}
            fetchingCurrent={fetchingCurrent}
            fetchNotice={fetchNotice}
            onDismissFetchNotice={() => setFetchNotice(null)}
          />
            <SidebarResizeHandle
              width={sidebarWidth}
              onWidthChange={setSidebarWidth}
              onWidthCommit={handleSidebarWidthCommit}
            />
          </div>
        </AppShell.Navbar>

        <AppShell.Main className="mv-app-main">
          {osuRunning ? (
            <Alert
              icon={<IconAlertTriangle size={16} />}
              color="yellow"
              variant="light"
              className="mv-alert-slide-down"
              px="md"
              py="xs"
              style={{
                borderRadius: 0,
                borderBottom: '1px solid rgba(255, 255, 255, 0.06)'
              }}
            >
              osu! is running. Close the editor or leave song select before saving, or osu! may
              overwrite your changes on disk.
            </Alert>
          ) : null}
          <ScrollArea
            offsetScrollbars
            type="always"
            h="calc(100vh - var(--app-shell-header-offset, 0rem) + var(--app-shell-padding))"
          >
            <Container p="sm" fluid className="mv-app-main-panel">
              {selected ? (
                <div key={selected.folderPath} className="mv-beatmap-panel-enter">
                  <BeatmapWorkspace
                    ref={workspaceRef}
                    selected={selected}
                    beatmaps={beatmaps}
                    osuRunning={osuRunning}
                    onDirtyChange={setEditorDirty}
                    onNavigateTo={handleNavigateTo}
                    onSelectedRefresh={setSelected}
                    loadBeatmaps={loadBeatmaps}
                  />
                </div>
              ) : (
                <NoBeatmapSelected loading={false} />
              )}
            </Container>
          </ScrollArea>
        </AppShell.Main>
      </AppShell>

      <Modal
        opened={showUnsavedSwitch}
        onClose={() => {
          setShowUnsavedSwitch(false)
          setPendingSelect(null)
        }}
        title="Unsaved changes"
        {...appModalProps}
      >
        <Stack gap="md" className="mv-modal-stagger">
        <Text size="sm">
          You have unsaved edits (metadata and/or combo colours). Save them, discard them, or stay
          on this mapset?
        </Text>
        <Group justify="flex-end" gap="sm" className="mv-modal-actions">
          <Button
            variant="default"
            onClick={() => {
              setShowUnsavedSwitch(false)
              setPendingSelect(null)
            }}
          >
            Cancel
          </Button>
          <Button color="red" variant="light" onClick={discardUnsavedAndContinue}>
            Discard changes
          </Button>
          <Button onClick={saveAndSwitch}>
            Save and open
          </Button>
        </Group>
        </Stack>
      </Modal>

      <Modal
        opened={showUnsavedClose}
        onClose={() => setShowUnsavedClose(false)}
        title="Unsaved changes"
        {...appModalProps}
      >
        <Stack gap="md" className="mv-modal-stagger">
        <Text size="sm">
          You have unsaved edits (metadata and/or combo colours). Save them, close without saving,
          or stay in the app?
        </Text>
        <Group justify="flex-end" gap="sm" className="mv-modal-actions">
          <Button variant="default" onClick={() => setShowUnsavedClose(false)}>
            Cancel
          </Button>
          <Button
            color="red"
            variant="light"
            onClick={() => {
              setShowUnsavedClose(false)
              void window.api.confirmAppClose()
            }}
          >
            Close without saving
          </Button>
          <Button onClick={saveAndClose}>
            Save and close
          </Button>
        </Group>
        </Stack>
      </Modal>
    </>
  )
}

export default function App(): JSX.Element {
  const [songsPath, setSongsPath] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [osuRunning, setOsuRunning] = useState(false)

  useEffect(() => {
    if (!songsPath) {
      setOsuRunning(false)
      return
    }
    const poll = (): void => {
      void window.api.isOsuRunning().then(setOsuRunning)
    }
    poll()
    const interval = setInterval(poll, 5000)
    return () => clearInterval(interval)
  }, [songsPath])

  const refreshSettings = useCallback(async () => {
    setLoading(true)
    const settings = await window.api.getSettings()
    setSongsPath(settings.songsPath)
    setLoading(false)
  }, [])

  useEffect(() => {
    void refreshSettings()
  }, [refreshSettings])

  return (
    <MantineProvider defaultColorScheme="dark" theme={theme} cssVariablesResolver={cssVarResolver}>
      <Notifications classNames={{ root: 'mv-notifications-root' }} position="top-center" />
      <UpToDatePill />
      <UpdateModal />
      <WindowBar osuRunning={osuRunning} />
      <WindowResizeHandles />
      {loading ? (
        <Center h="100vh">
          <Loader color="primary" />
        </Center>
      ) : !songsPath ? (
        <SetupScreen onReady={setSongsPath} />
      ) : (
        <MainScreen songsPath={songsPath} onSongsPathChange={setSongsPath} osuRunning={osuRunning} />
      )}
    </MantineProvider>
  )
}
