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
import { useDebouncedValue, useDisclosure } from '@mantine/hooks'
import { Notifications } from '@mantine/notifications'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { filterBeatmaps } from '@shared/filter-beatmaps'
import { resolveBeatmapSetId } from '@shared/beatmap-set-id'
import { matchBeatmapByDisplayTitle } from '@shared/match-display-name'
import { comboColoursEqual } from '@shared/combo-colours'
import {
  beatmapsetSupportsComboColours,
  gameModesFromModeInts
} from '@shared/osu-game-mode'
import {
  getDirtyMetadataFields,
  metadataEquals,
  normalizeBeatmapMetadata
} from '@shared/metadata-utils'
import { applyRomanizedFieldLocks, getRomanizedFieldLocks } from '@shared/romanization'
import { formatSaveSuccessMessage } from '@shared/save-metadata-message'
import type {
  BeatmapComboColour,
  BeatmapDifficultySummary,
  BeatmapMetadata,
  BeatmapSetSummary,
  DetectedPath,
  ImportMetadataMode,
  ImportMetadataSource,
  TagSectionsExpanded
} from '@shared/types'
import BeatmapsSidebar from './components/beatmaps/BeatmapsSidebar'
import SidebarResizeHandle from './components/beatmaps/SidebarResizeHandle'
import KeyboardShortcutsHelp from './components/common/KeyboardShortcutsHelp'
import NoBeatmapSelected from './components/common/NoBeatmapSelected'
import MetadataEditor from './components/metadata/MetadataEditor'
import ImportMetadataModal, { applyMetadataImport } from './components/metadata/ImportMetadataModal'
import SettingsButton from './components/settings/SettingsButton'
import UpToDatePill from './components/common/UpToDatePill'
import UpdateModal from './components/settings/UpdateModal'
import WindowBar from './components/window/WindowBar'
import logoUrl from './assets/logo.png'
import { theme } from './theme/Theme'
import { modalClassNames, modalOverlayProps, modalTransitionProps } from './theme/modal'
import { notifyError, notifySuccess } from './utils/notify'

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

const emptyMetadata = (): BeatmapMetadata => ({
  artist: '',
  artistUnicode: '',
  title: '',
  titleUnicode: '',
  source: '',
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
  const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(true)
  const [beatmaps, setBeatmaps] = useState<BeatmapSetSummary[]>([])
  const [selected, setSelected] = useState<BeatmapSetSummary | null>(null)
  const [metadata, setMetadata] = useState<BeatmapMetadata>(emptyMetadata())
  const [savedMetadata, setSavedMetadata] = useState<BeatmapMetadata | null>(null)
  const [comboColours, setComboColours] = useState<BeatmapComboColour[]>([])
  const [savedComboColours, setSavedComboColours] = useState<BeatmapComboColour[] | null>(null)
  const [difficulties, setDifficulties] = useState<BeatmapDifficultySummary[]>([])
  const [difficultyVersions, setDifficultyVersions] = useState<string[]>([])
  const [creator, setCreator] = useState('')
  const [isFeaturedArtist, setIsFeaturedArtist] = useState(false)
  const [isOnOsuWebsite, setIsOnOsuWebsite] = useState(false)
  const [mismatched, setMismatched] = useState(false)
  const [mismatchedFields, setMismatchedFields] = useState<(keyof BeatmapMetadata)[]>([])
  const [comboColoursMismatched, setComboColoursMismatched] = useState(false)
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
  const [importedWebBeatmapSetId, setImportedWebBeatmapSetId] = useState<number | null>(null)
  const [highlightedFolderPath, setHighlightedFolderPath] = useState<string | null>(null)
  const [showUnsavedSwitch, setShowUnsavedSwitch] = useState(false)
  const [showUnsavedClose, setShowUnsavedClose] = useState(false)
  const [pendingSelect, setPendingSelect] = useState<BeatmapSetSummary | null>(null)
  const [switchAfterSave, setSwitchAfterSave] = useState(false)
  const [closeAfterSave, setCloseAfterSave] = useState(false)
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

  const [debouncedListSearch] = useDebouncedValue(listSearch, 200)
  const filteredBeatmaps = useMemo(
    () => filterBeatmaps(beatmaps, debouncedListSearch),
    [beatmaps, debouncedListSearch]
  )

  const currentGameModes = useMemo(
    () => gameModesFromModeInts(difficulties.map((d) => d.mode)),
    [difficulties]
  )

  const supportsComboColours = useMemo(
    () => beatmapsetSupportsComboColours(currentGameModes),
    [currentGameModes]
  )

  const isDirty = useMemo(() => {
    if (savedMetadata === null || savedComboColours === null) return false
    const metadataDirty = !metadataEquals(metadata, savedMetadata)
    const comboDirty =
      supportsComboColours &&
      !comboColoursEqual(comboColours, savedComboColours)
    return metadataDirty || comboDirty
  }, [metadata, savedMetadata, comboColours, savedComboColours, supportsComboColours])

  const dirtyFolderPath = isDirty ? (selected?.folderPath ?? null) : null

  const dirtyMetadataFields = useMemo(
    () => (savedMetadata ? getDirtyMetadataFields(metadata, savedMetadata) : []),
    [metadata, savedMetadata]
  )

  const comboColoursDirty = useMemo(
    () =>
      supportsComboColours &&
      savedComboColours !== null &&
      !comboColoursEqual(comboColours, savedComboColours),
    [supportsComboColours, comboColours, savedComboColours]
  )

  const needsMismatchConfirm = useMemo(() => {
    if (comboColoursDirty && comboColoursMismatched) return true
    return dirtyMetadataFields.some((field) => mismatchedFields.includes(field))
  }, [comboColoursDirty, comboColoursMismatched, dirtyMetadataFields, mismatchedFields])

  const loadBeatmaps = useCallback(async (force = false): Promise<BeatmapSetSummary[]> => {
    setLoadingList(true)
    try {
      const sets = await window.api.scanBeatmaps(force)
      setBeatmaps(sets)
      return sets
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Failed to scan beatmaps.')
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
      setTagSectionsExpanded(settings.tagSectionsExpanded)
      setSidebarWidth(settings.sidebarWidth)
    })
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

  const selectBeatmap = useCallback(async (set: BeatmapSetSummary): Promise<void> => {
    setSelected(set)
    setImportedWebBeatmapSetId(null)
    setIsOnOsuWebsite(false)
    setStatus(null)
    setLoadingMeta(true)
    try {
      const loaded = await window.api.loadMetadata(set.folderPath)
      setMetadata(loaded.metadata)
      setSavedMetadata(loaded.metadata)
      setComboColours(loaded.comboColours)
      setSavedComboColours(loaded.comboColours)
      setDifficulties(loaded.difficulties)
      setDifficultyVersions(loaded.difficultyVersions)
      setCreator(loaded.creator)
      setIsFeaturedArtist(loaded.isFeaturedArtist)
      setIsOnOsuWebsite(loaded.isOnOsuWebsite)
      setMismatched(loaded.mismatched)
      setMismatchedFields(loaded.mismatchedFields)
      setComboColoursMismatched(loaded.comboColoursMismatched)
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
    if (!selected || savedMetadata === null || savedComboColours === null) return
    if (saving) return

    const folderPath = selected.folderPath
    const shouldSwitch = switchAfterSave
    const shouldClose = closeAfterSave
    const nextSet = shouldSwitch ? pendingSelect : null

    const normalizedCurrent = normalizeBeatmapMetadata(metadata)
    const normalizedSaved = normalizeBeatmapMetadata(savedMetadata)
    const toSave = applyRomanizedFieldLocks(
      normalizedCurrent,
      getRomanizedFieldLocks(normalizedCurrent)
    )
    const savePayload = {
      metadata: toSave,
      comboColours,
      savedMetadata: normalizedSaved,
      savedComboColours
    }

    setSaving(true)
    setStatus(null)
    try {
      const result = await window.api.saveMetadata(folderPath, savePayload)
      const message = formatSaveSuccessMessage(result)
      setStatus(message)
      if (result.updatedFiles > 0) {
        notifySuccess(message)
      }

      const loaded = await window.api.loadMetadata(folderPath)
      setMetadata(loaded.metadata)
      setSavedMetadata(loaded.metadata)
      setComboColours(loaded.comboColours)
      setSavedComboColours(loaded.comboColours)
      setMismatched(loaded.mismatched)
      setMismatchedFields(loaded.mismatchedFields)
      setComboColoursMismatched(loaded.comboColoursMismatched)

      const sets = await loadBeatmaps()
      const refreshed = sets.find((b) => b.folderPath === folderPath)
      if (refreshed) setSelected(refreshed)

      setShowMismatchConfirm(false)
      setShowSaveSafety(false)

      if (shouldSwitch && nextSet) {
        setPendingSelect(null)
        setSwitchAfterSave(false)
        await selectBeatmap(nextSet)
      } else if (shouldClose) {
        setCloseAfterSave(false)
        void window.api.confirmAppClose()
      }
    } catch (err) {
      const failMessage = err instanceof Error ? err.message : 'Unknown error'
      setStatus(`Failed: ${failMessage}`)
      notifyError(`Save failed: ${failMessage}`)
      if (shouldSwitch && nextSet) {
        setSwitchAfterSave(true)
        setShowUnsavedSwitch(true)
      } else if (shouldClose) {
        setCloseAfterSave(true)
        setShowUnsavedClose(true)
      }
    } finally {
      setSaving(false)
    }
  }, [
    selected,
    metadata,
    comboColours,
    savedMetadata,
    savedComboColours,
    saving,
    loadBeatmaps,
    switchAfterSave,
    closeAfterSave,
    pendingSelect,
    selectBeatmap
  ])

  const handleSave = useCallback((): void => {
    if (!selected) return
    setSwitchAfterSave(false)
    setCloseAfterSave(false)
    setShowSaveSafety(true)
  }, [selected])

  const saveAndSwitch = useCallback((): void => {
    if (!selected || !pendingSelect) return
    setShowUnsavedSwitch(false)
    setSwitchAfterSave(true)
    setCloseAfterSave(false)
    setShowSaveSafety(true)
  }, [selected, pendingSelect])

  const cancelSaveFlow = useCallback((): void => {
    if (switchAfterSave && pendingSelect) {
      setShowUnsavedSwitch(true)
    } else if (closeAfterSave) {
      setShowUnsavedClose(true)
    }
    setSwitchAfterSave(false)
    setCloseAfterSave(false)
    setShowSaveSafety(false)
    setShowMismatchConfirm(false)
  }, [switchAfterSave, closeAfterSave, pendingSelect])

  const confirmSaveSafety = useCallback((): void => {
    if (saving) return
    if (needsMismatchConfirm) {
      setShowSaveSafety(false)
      setShowMismatchConfirm(true)
      return
    }
    void performSave()
  }, [needsMismatchConfirm, performSave, saving])

  const saveAndClose = useCallback((): void => {
    setShowUnsavedClose(false)
    setCloseAfterSave(true)
    setSwitchAfterSave(false)
    setShowSaveSafety(true)
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
        handleSave()
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
  }, [handleSave, moveListSelection, fetchCurrentMap])

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
    async (
      source: ImportMetadataSource,
      mode: ImportMetadataMode,
      includeComboColours: boolean
    ): Promise<void> => {
      setImportingMetadata(true)
      try {
        const applyCombo = includeComboColours && supportsComboColours
        if (source.kind === 'local') {
          const loaded = await window.api.loadMetadata(source.folderPath)
          setMetadata((current) => applyMetadataImport(current, loaded.metadata, mode))
          setImportedWebBeatmapSetId(null)
          if (applyCombo) {
            setComboColours(loaded.comboColours)
          }
        } else {
          const imported = await window.api.loadImportSourceFromBeatmapSet(source.beatmapSetId)
          setMetadata((current) => applyMetadataImport(current, imported.metadata, mode))
          setImportedWebBeatmapSetId(source.beatmapSetId)
          if (applyCombo) {
            setComboColours(imported.comboColours)
          }
        }
        setShowImportModal(false)
        const parts: string[] = []
        if (mode === 'full') parts.push('full metadata')
        else if (mode === 'tags') parts.push('tags')
        else parts.push('song metadata')
        if (applyCombo) parts.push('combo colours')
        const message =
          parts.length > 0 ? `Imported ${parts.join(' and ')}.` : 'Nothing to import.'
        setStatus(message)
        notifySuccess(message)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to import metadata.'
        setStatus(message)
        notifyError(message)
      } finally {
        setImportingMetadata(false)
      }
    },
    [supportsComboColours]
  )

  const discardUnsavedAndContinue = (): void => {
    setShowUnsavedSwitch(false)
    if (pendingSelect) {
      void selectBeatmap(pendingSelect)
      setPendingSelect(null)
    }
  }

  const handleRevert = useCallback((): void => {
    if (!selected) return
    void selectBeatmap(selected)
  }, [selected, selectBeatmap])

  return (
    <>
      <AppShell
        className="mv-app-shell"
        header={{ height: 92 }}
        navbar={{
          width: sidebarWidth,
          breakpoint: 'xs',
          collapsed: { desktop: !desktopOpened }
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
            <Burger opened={desktopOpened} onClick={toggleDesktop} size="sm" />
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
            <Container p="sm" fluid maw={720} className="mv-app-main-panel">
              {selected ? (
                <div key={selected.folderPath} className="mv-beatmap-panel-enter">
                <MetadataEditor
                  selected={selected}
                  metadata={metadata}
                  difficulties={difficulties}
                  difficultyVersions={difficultyVersions}
                  creator={creator}
                  isFeaturedArtist={isFeaturedArtist}
                  isOnOsuWebsite={isOnOsuWebsite}
                  mismatched={mismatched}
                  comboColours={comboColours}
                  comboColoursMismatched={comboColoursMismatched}
                  isDirty={isDirty}
                  loading={loadingMeta}
                  saving={saving}
                  status={status}
                  tagSectionsExpanded={tagSectionsExpanded}
                  onTagSectionsExpandedChange={handleTagSectionsExpandedChange}
                  onChange={setMetadata}
                  onComboColoursChange={setComboColours}
                  onSave={handleSave}
                  onRevert={handleRevert}
                  onOpenFolder={openSelectedFolder}
                  onOpenBeatmapPage={openSelectedBeatmapPage}
                  onOpenImportModal={() => setShowImportModal(true)}
                  importedWebBeatmapSetId={importedWebBeatmapSetId}
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
          currentMetadata={metadata}
          currentComboColours={comboColours}
          currentGameModes={currentGameModes}
          importing={importingMetadata}
          onImport={(source, mode, includeComboColours) =>
            void handleImportMetadata(source, mode, includeComboColours)
          }
        />
      )}

      <Modal
        opened={showSaveSafety}
        onClose={cancelSaveFlow}
        title="Before you save"
        size="md"
        {...appModalProps}
      >
        <Stack gap="md" className="mv-modal-stagger">
          <Text size="sm" c="dimmed">
            Saving applies your metadata and combo colours to every difficulty in this mapset.
            {switchAfterSave
              ? ' After saving, the other mapset will open.'
              : closeAfterSave
                ? ' After saving, the app will close.'
                : ''}
          </Text>
          <Alert
            icon={<IconAlertTriangle />}
            color={osuRunning ? 'red' : 'yellow'}
            variant="light"
          >
            {osuRunning
              ? 'osu! is running. Close the editor or leave song select before saving, or osu! may overwrite your changes on disk.'
              : "Make sure the map is not open in the editor and that you're on song select before saving. If the map is still open in the editor, osu! may overwrite your changes."}
          </Alert>
          <Group justify="flex-end" gap="sm" className="mv-modal-actions">
            <Button variant="default" onClick={cancelSaveFlow}>
              Cancel
            </Button>
            <Button onClick={confirmSaveSafety} loading={saving} disabled={saving}>
              {switchAfterSave ? 'Save and open' : closeAfterSave ? 'Save and close' : 'Save'}
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={showUnsavedSwitch}
        onClose={() => {
          setShowUnsavedSwitch(false)
          setPendingSelect(null)
          setSwitchAfterSave(false)
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
              setSwitchAfterSave(false)
            }}
          >
            Cancel
          </Button>
          <Button color="red" variant="light" onClick={discardUnsavedAndContinue}>
            Discard changes
          </Button>
          <Button onClick={saveAndSwitch} loading={saving} disabled={saving}>
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
          <Button onClick={saveAndClose} loading={saving}>
            Save and close
          </Button>
        </Group>
        </Stack>
      </Modal>

      <Modal
        opened={showMismatchConfirm}
        onClose={cancelSaveFlow}
        title="Unify mismatched difficulties?"
        {...appModalProps}
      >
        <Stack gap="md" className="mv-modal-stagger">
        <Text size="sm">
          Some difficulties differ in the fields you are saving. Your current editor values will be
          written to every .osu file in this set for those fields only.
          {switchAfterSave
            ? ' After saving, the other mapset will open.'
            : closeAfterSave
              ? ' After saving, the app will close.'
              : ''}
        </Text>
        <Group justify="flex-end" gap="sm" className="mv-modal-actions">
          <Button variant="default" onClick={cancelSaveFlow}>
            Cancel
          </Button>
          <Button
            onClick={() => void performSave()}
            loading={saving}
            disabled={saving}
          >
            {switchAfterSave
              ? 'Save and open'
              : closeAfterSave
                ? 'Save and close'
                : 'Save anyway'}
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
