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
import { useDisclosure } from '@mantine/hooks'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { filterBeatmaps } from '@shared/filter-beatmaps'
import { resolveBeatmapSetId } from '@shared/beatmap-set-id'
import { matchBeatmapByDisplayTitle } from '@shared/match-display-name'
import { metadataEquals } from '@shared/metadata-utils'
import { applyRomanizedFieldLocks, getRomanizedFieldLocks } from '@shared/romanization'
import type {
  BeatmapDifficultySummary,
  BeatmapMetadata,
  BeatmapSetSummary,
  DetectedPath,
  TagSectionsExpanded
} from '@shared/types'
import BeatmapsSidebar from './components/beatmaps/BeatmapsSidebar'
import NoBeatmapSelected from './components/common/NoBeatmapSelected'
import MetadataEditor from './components/metadata/MetadataEditor'
import ImportMetadataModal, {
  applyMetadataImport,
  type ImportMetadataMode
} from './components/metadata/ImportMetadataModal'
import SettingsButton from './components/settings/SettingsButton'
import WindowBar from './components/window/WindowBar'
import { theme } from './theme/Theme'
import '@mantine/core/styles.css'
import './theme/global.scss'

const cssVarResolver: CSSVariablesResolver = () => ({
  variables: {},
  light: {},
  dark: {
    '--mantine-color-text': '#fff',
    '--mantine-color-dimmed': '#9e9e9e'
  }
})

const emptyMetadata = (): BeatmapMetadata => ({
  artist: '',
  artistUnicode: '',
  title: '',
  titleUnicode: '',
  tags: ''
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
      <Paper p="xl" radius="lg" bg={theme.colors.dark[6]} maw={520} w="100%" className="mv-paper-surface">
        <Stack gap="md">
          <Text fw={700} size="xl">
            Osu Meta
          </Text>
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
  onSongsPathChange
}: {
  songsPath: string
  onSongsPathChange: (path: string) => void
}): JSX.Element {
  const theme = useMantineTheme()
  const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(true)
  const [beatmaps, setBeatmaps] = useState<BeatmapSetSummary[]>([])
  const [selected, setSelected] = useState<BeatmapSetSummary | null>(null)
  const [metadata, setMetadata] = useState<BeatmapMetadata>(emptyMetadata())
  const [savedMetadata, setSavedMetadata] = useState<BeatmapMetadata | null>(null)
  const [difficulties, setDifficulties] = useState<BeatmapDifficultySummary[]>([])
  const [difficultyVersions, setDifficultyVersions] = useState<string[]>([])
  const [creator, setCreator] = useState('')
  const [source, setSource] = useState('')
  const [isFeaturedArtist, setIsFeaturedArtist] = useState(false)
  const [isOnOsuWebsite, setIsOnOsuWebsite] = useState(false)
  const [mismatched, setMismatched] = useState(false)
  const [tagSectionsExpanded, setTagSectionsExpanded] = useState<TagSectionsExpanded>({
    featured: true,
    source: true,
    guest: true,
    guild: true,
    collab: true,
    wrongTags: true
  })
  const [sidebarWidth, setSidebarWidth] = useState(256)
  const [showImportModal, setShowImportModal] = useState(false)
  const [importingMetadata, setImportingMetadata] = useState(false)
  const [highlightedFolderPath, setHighlightedFolderPath] = useState<string | null>(null)
  const [osuRunning, setOsuRunning] = useState(false)
  const [showUnsavedSwitch, setShowUnsavedSwitch] = useState(false)
  const [showUnsavedClose, setShowUnsavedClose] = useState(false)
  const [pendingSelect, setPendingSelect] = useState<BeatmapSetSummary | null>(null)
  const [loadingList, setLoadingList] = useState(true)
  const [loadingMeta, setLoadingMeta] = useState(false)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [showSaveSafety, setShowSaveSafety] = useState(false)
  const [showMismatchConfirm, setShowMismatchConfirm] = useState(false)
  const [listSearch, setListSearch] = useState('')
  const [fetchingCurrent, setFetchingCurrent] = useState(false)
  const [fetchNotice, setFetchNotice] = useState<string | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const filteredBeatmaps = useMemo(() => filterBeatmaps(beatmaps, listSearch), [beatmaps, listSearch])

  const isDirty = useMemo(
    () => savedMetadata !== null && !metadataEquals(metadata, savedMetadata),
    [metadata, savedMetadata]
  )

  const loadBeatmaps = useCallback(async (force = false): Promise<void> => {
    setLoadingList(true)
    try {
      const sets = await window.api.scanBeatmaps(force)
      setBeatmaps(sets)
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Failed to scan beatmaps.')
    } finally {
      setLoadingList(false)
    }
  }, [])

  useEffect(() => {
    void loadBeatmaps()
  }, [loadBeatmaps, songsPath])

  useEffect(() => {
    void window.api.getSettings().then((settings) => {
      setTagSectionsExpanded(settings.tagSectionsExpanded)
      setSidebarWidth(settings.sidebarWidth)
    })
  }, [])

  useEffect(() => {
    const poll = (): void => {
      void window.api.isOsuRunning().then(setOsuRunning)
    }
    poll()
    const interval = setInterval(poll, 3000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    void window.api.setCloseBlocked(isDirty)
  }, [isDirty])

  useEffect(() => {
    return window.api.onRequestCloseConfirm(() => {
      if (isDirty) setShowUnsavedClose(true)
      else void window.api.confirmAppClose()
    })
  }, [isDirty])

  useEffect(() => {
    if (!selected) {
      setIsOnOsuWebsite(false)
      return
    }
    const setId = resolveBeatmapSetId(selected)
    if (setId == null) {
      setIsOnOsuWebsite(false)
      return
    }

    let cancelled = false
    void window.api.checkBeatmapSetOnline(setId).then((online) => {
      if (!cancelled) setIsOnOsuWebsite(online)
    })
    return () => {
      cancelled = true
    }
  }, [selected?.folderPath, selected?.beatmapSetId, selected?.folderName])

  const selectBeatmap = useCallback(async (set: BeatmapSetSummary): Promise<void> => {
    setSelected(set)
    setIsOnOsuWebsite(false)
    setStatus(null)
    setLoadingMeta(true)
    try {
      const loaded = await window.api.loadMetadata(set.folderPath)
      setMetadata(loaded.metadata)
      setSavedMetadata(loaded.metadata)
      setDifficulties(loaded.difficulties)
      setDifficultyVersions(loaded.difficultyVersions)
      setCreator(loaded.creator)
      setSource(loaded.source)
      setIsFeaturedArtist(loaded.isFeaturedArtist)
      setIsOnOsuWebsite(loaded.isOnOsuWebsite)
      setMismatched(loaded.mismatched)
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Failed to load metadata.')
    } finally {
      setLoadingMeta(false)
    }
  }, [])

  const trySelectBeatmap = useCallback(
    (set: BeatmapSetSummary): void => {
      if (isDirty) {
        setPendingSelect(set)
        setShowUnsavedSwitch(true)
        return
      }
      void selectBeatmap(set)
    },
    [isDirty, selectBeatmap]
  )

  const performSave = useCallback(async (): Promise<void> => {
    if (!selected) return
    setSaving(true)
    setStatus(null)
    try {
      const toSave = applyRomanizedFieldLocks(metadata, getRomanizedFieldLocks(metadata))
      const result = await window.api.saveMetadata(selected.folderPath, toSave)
      setMismatched(false)
      setSavedMetadata(toSave)
      setStatus(`Updated ${result.updatedFiles} .osu file(s).`)
      await loadBeatmaps()
      const refreshed = (await window.api.scanBeatmaps()).find(
        (b) => b.folderPath === selected.folderPath
      )
      if (refreshed) setSelected(refreshed)
    } catch (err) {
      setStatus(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setSaving(false)
      setShowMismatchConfirm(false)
      setShowSaveSafety(false)
    }
  }, [selected, metadata, loadBeatmaps])

  const handleSave = useCallback((): void => {
    if (!selected) return
    setShowSaveSafety(true)
  }, [selected])

  const confirmSaveSafety = useCallback((): void => {
    setShowSaveSafety(false)
    if (mismatched) {
      setShowMismatchConfirm(true)
      return
    }
    void performSave()
  }, [mismatched, performSave])

  const fetchCurrentMap = useCallback(async (): Promise<void> => {
    setFetchingCurrent(true)
    setFetchNotice(null)
    try {
      const result = await window.api.lookupCurrentBeatmap(beatmaps)

      const selectByFolder = (folderPath: string): boolean => {
        const found = beatmaps.find(
          (b) => b.folderPath.toLowerCase() === folderPath.toLowerCase()
        )
        if (!found) return false
        setHighlightedFolderPath(found.folderPath)
        window.setTimeout(() => setHighlightedFolderPath(null), 2500)
        void selectBeatmap(found)
        setFetchNotice(null)
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
          setHighlightedFolderPath(found.folderPath)
          window.setTimeout(() => setHighlightedFolderPath(null), 2500)
          await selectBeatmap(found)
          setFetchNotice(null)
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
  }, [beatmaps, selectBeatmap])

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
        handleSave()
        return
      }

      if (event.ctrlKey && event.key.toLowerCase() === 'f') {
        event.preventDefault()
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
  }, [handleSave, moveListSelection])

  const openSelectedFolder = (): void => {
    if (!selected) return
    void window.api.openBeatmapFolder(selected.folderPath).catch((err) => {
      setStatus(err instanceof Error ? err.message : 'Failed to open folder.')
    })
  }

  const openSelectedBeatmapPage = (): void => {
    if (!selected) return
    const setId = resolveBeatmapSetId(selected)
    if (setId == null) return
    void window.api.openBeatmapPage(setId).catch((err) => {
      setStatus(err instanceof Error ? err.message : 'Failed to open beatmap page.')
    })
  }

  const handleTagSectionsExpandedChange = (value: TagSectionsExpanded): void => {
    setTagSectionsExpanded(value)
    void window.api.setTagSectionsExpanded(value)
  }

  const handleImportMetadata = useCallback(
    async (sourceFolderPath: string, mode: ImportMetadataMode): Promise<void> => {
      setImportingMetadata(true)
      try {
        const loaded = await window.api.loadMetadata(sourceFolderPath)
        setMetadata((current) => applyMetadataImport(current, loaded.metadata, mode))
        setShowImportModal(false)
        const labels: Record<ImportMetadataMode, string> = {
          full: 'Imported full metadata.',
          tags: 'Imported tags.',
          song: 'Imported song metadata.'
        }
        setStatus(labels[mode])
      } catch (err) {
        setStatus(err instanceof Error ? err.message : 'Failed to import metadata.')
      } finally {
        setImportingMetadata(false)
      }
    },
    []
  )

  const discardUnsavedAndContinue = (): void => {
    setShowUnsavedSwitch(false)
    if (pendingSelect) {
      void selectBeatmap(pendingSelect)
      setPendingSelect(null)
    }
  }

  return (
    <>
      <AppShell
        header={{ height: 92 }}
        navbar={{
          width: sidebarWidth,
          breakpoint: 'xs',
          collapsed: { desktop: !desktopOpened }
        }}
        padding={0}
      >
        <AppShell.Header
          style={{
            marginTop: 'var(--mv-window-bar-height)',
            height: 60,
            fontFamily: theme.headings.fontFamily,
            background: theme.colors.dark[8],
            viewTransitionName: 'app-header'
          }}
        >
          <Group h={60} px="md" wrap="nowrap">
            <Burger opened={desktopOpened} onClick={toggleDesktop} size="sm" />
            <Text fw={600} size="sm" style={{ flex: 1, minWidth: 0 }}>
              Metadata
            </Text>
            <SettingsButton songsPath={songsPath} onSongsPathChange={onSongsPathChange} />
          </Group>
        </AppShell.Header>

        <AppShell.Navbar style={{ viewTransitionName: 'app-sidebar' }}>
          <BeatmapsSidebar
            beatmaps={beatmaps}
            loading={loadingList}
            songsConfigured={Boolean(songsPath)}
            selectedFolderPath={selected?.folderPath ?? null}
            highlightedFolderPath={highlightedFolderPath}
            search={listSearch}
            onSearchChange={setListSearch}
            searchInputRef={searchInputRef}
            onSelect={trySelectBeatmap}
            onRefresh={(force) => void loadBeatmaps(force)}
            onFetchCurrent={() => void fetchCurrentMap()}
            fetchingCurrent={fetchingCurrent}
            fetchNotice={fetchNotice}
          />
        </AppShell.Navbar>

        <AppShell.Main className="mv-app-main">
          <ScrollArea
            offsetScrollbars
            type="always"
            h="calc(100vh - var(--app-shell-header-offset, 0rem) + var(--app-shell-padding))"
          >
            <Container p="sm" fluid maw={720}>
              {selected ? (
                <div key={selected.folderPath} className="mv-route-outlet-wrap">
                <MetadataEditor
                  selected={selected}
                  metadata={metadata}
                  difficulties={difficulties}
                  difficultyVersions={difficultyVersions}
                  creator={creator}
                  source={source}
                  isFeaturedArtist={isFeaturedArtist}
                  isOnOsuWebsite={isOnOsuWebsite}
                  mismatched={mismatched}
                  isDirty={isDirty}
                  loading={loadingMeta}
                  saving={saving}
                  status={status}
                  tagSectionsExpanded={tagSectionsExpanded}
                  onTagSectionsExpandedChange={handleTagSectionsExpandedChange}
                  onChange={setMetadata}
                  onSave={handleSave}
                  onOpenFolder={openSelectedFolder}
                  onOpenBeatmapPage={openSelectedBeatmapPage}
                  onOpenImportModal={() => setShowImportModal(true)}
                />
                </div>
              ) : (
                <NoBeatmapSelected loading={loadingMeta} />
              )}
            </Container>
          </ScrollArea>
        </AppShell.Main>
      </AppShell>

      {selected && (
        <ImportMetadataModal
          opened={showImportModal}
          onClose={() => setShowImportModal(false)}
          beatmaps={beatmaps}
          currentFolderPath={selected.folderPath}
          importing={importingMetadata}
          onImport={(sourceFolderPath, mode) => void handleImportMetadata(sourceFolderPath, mode)}
        />
      )}

      <Modal
        opened={showSaveSafety}
        onClose={() => setShowSaveSafety(false)}
        title="Before you save"
        size="md"
        centered
      >
        <Stack gap="md">
          <Alert
            icon={<IconAlertTriangle />}
            color={osuRunning ? 'red' : 'yellow'}
            variant="light"
          >
            {osuRunning
              ? 'osu! is running. Close the editor or leave song select before saving, or osu! may overwrite your changes on disk.'
              : "Make sure the map is not open in the editor and that you're on song select before saving. If the map is still open in the editor, osu! may overwrite your changes."}
          </Alert>
          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={() => setShowSaveSafety(false)}>
              Cancel
            </Button>
            <Button onClick={confirmSaveSafety}>Save</Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={showUnsavedSwitch}
        onClose={() => {
          setShowUnsavedSwitch(false)
          setPendingSelect(null)
        }}
        title="Unsaved changes"
        centered
      >
        <Text size="sm" mb="md">
          You have unsaved metadata edits. Discard them and open the other mapset?
        </Text>
        <Group justify="flex-end" gap="sm">
          <Button
            variant="default"
            onClick={() => {
              setShowUnsavedSwitch(false)
              setPendingSelect(null)
            }}
          >
            Cancel
          </Button>
          <Button color="red" onClick={discardUnsavedAndContinue}>
            Discard changes
          </Button>
        </Group>
      </Modal>

      <Modal
        opened={showUnsavedClose}
        onClose={() => setShowUnsavedClose(false)}
        title="Unsaved changes"
        centered
      >
        <Text size="sm" mb="md">
          You have unsaved metadata edits. Close anyway and lose your changes?
        </Text>
        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={() => setShowUnsavedClose(false)}>
            Cancel
          </Button>
          <Button
            color="red"
            onClick={() => {
              setShowUnsavedClose(false)
              void window.api.confirmAppClose()
            }}
          >
            Close without saving
          </Button>
        </Group>
      </Modal>

      <Modal
        opened={showMismatchConfirm}
        onClose={() => setShowMismatchConfirm(false)}
        title="Unify mismatched metadata?"
        centered
      >
        <Text size="sm" mb="md">
          Difficulties in this set have different metadata values. Saving will apply your edits to
          every .osu file.
        </Text>
        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={() => setShowMismatchConfirm(false)}>
            Cancel
          </Button>
          <Button onClick={() => void performSave()}>Save anyway</Button>
        </Group>
      </Modal>
    </>
  )
}

export default function App(): JSX.Element {
  const [songsPath, setSongsPath] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

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
      <WindowBar />
      {loading ? (
        <Center h="100vh">
          <Loader color="primary" />
        </Center>
      ) : !songsPath ? (
        <SetupScreen onReady={setSongsPath} />
      ) : (
        <MainScreen songsPath={songsPath} onSongsPathChange={setSongsPath} />
      )}
    </MantineProvider>
  )
}
