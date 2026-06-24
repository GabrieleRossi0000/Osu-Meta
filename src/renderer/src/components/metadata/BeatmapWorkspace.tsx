import {
  Alert,
  Button,
  Group,
  Modal,
  Stack,
  Text
} from '@mantine/core'
import { IconAlertTriangle } from '@tabler/icons-react'
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState
} from 'react'
import { getFeaturedArtistContext } from '@shared/featured-artist'
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
  ComboColourMismatchGroup,
  ImportMetadataMode,
  ImportMetadataSource,
  MetadataFieldMismatchDetail,
  TagSectionsExpanded
} from '@shared/types'
import { resolveBeatmapSetId } from '@shared/beatmap-set-id'
import ImportMetadataModal, { applyMetadataImport } from './ImportMetadataModal'
import MetadataEditor from './MetadataEditor'
import { modalClassNames, modalOverlayProps, modalTransitionProps } from '../../theme/modal'
import { notifyError, notifySuccess } from '../../utils/notify'

const appModalProps = {
  centered: true,
  classNames: modalClassNames,
  overlayProps: modalOverlayProps,
  transitionProps: modalTransitionProps
} as const

const emptyMetadata = (): BeatmapMetadata => ({
  artist: '',
  artistUnicode: '',
  title: '',
  titleUnicode: '',
  source: '',
  tags: ''
})

export interface BeatmapWorkspaceHandle {
  requestSave: () => void
  saveForNavigation: (options: {
    switchTo?: BeatmapSetSummary | null
    closeAfter?: boolean
  }) => void
}

interface BeatmapWorkspaceProps {
  selected: BeatmapSetSummary
  beatmaps: BeatmapSetSummary[]
  osuRunning: boolean
  onDirtyChange: (dirty: boolean) => void
  onNavigateTo: (set: BeatmapSetSummary) => void
  onSelectedRefresh: (set: BeatmapSetSummary) => void
  loadBeatmaps: (force?: boolean) => Promise<BeatmapSetSummary[]>
}

const BeatmapWorkspace = forwardRef<BeatmapWorkspaceHandle, BeatmapWorkspaceProps>(
  function BeatmapWorkspace(
    {
      selected,
      beatmaps,
      osuRunning,
      onDirtyChange,
      onNavigateTo,
      onSelectedRefresh,
      loadBeatmaps
    },
    ref
  ): JSX.Element {
    const [metadata, setMetadata] = useState<BeatmapMetadata>(emptyMetadata())
    const [savedMetadata, setSavedMetadata] = useState<BeatmapMetadata | null>(null)
    const [comboColours, setComboColours] = useState<BeatmapComboColour[]>([])
    const [savedComboColours, setSavedComboColours] = useState<BeatmapComboColour[] | null>(null)
    const [difficulties, setDifficulties] = useState<BeatmapDifficultySummary[]>([])
    const [creator, setCreator] = useState('')
    const [isFeaturedArtist, setIsFeaturedArtist] = useState(false)
    const [featuredArtistContext, setFeaturedArtistContext] = useState(false)
    const [isOnOsuWebsite, setIsOnOsuWebsite] = useState(false)
    const [mismatched, setMismatched] = useState(false)
    const [mismatchedFields, setMismatchedFields] = useState<(keyof BeatmapMetadata)[]>([])
    const [metadataMismatchDetails, setMetadataMismatchDetails] = useState<
      MetadataFieldMismatchDetail[]
    >([])
    const [comboColoursMismatched, setComboColoursMismatched] = useState(false)
    const [comboColourMismatchDetails, setComboColourMismatchDetails] = useState<
      ComboColourMismatchGroup[]
    >([])
    const [tagSectionsExpanded, setTagSectionsExpanded] = useState<TagSectionsExpanded>({
      featured: true,
      source: true,
      language: true,
      genre: true,
      guest: true,
      guild: true,
      collab: true,
      wrongTags: true
    })
    const [showImportModal, setShowImportModal] = useState(false)
    const [importingMetadata, setImportingMetadata] = useState(false)
    const [importedWebBeatmapSetId, setImportedWebBeatmapSetId] = useState<number | null>(null)
    const [loadingMeta, setLoadingMeta] = useState(true)
    const [saving, setSaving] = useState(false)
    const [status, setStatus] = useState<string | null>(null)
    const [showSaveSafety, setShowSaveSafety] = useState(false)
    const [showMismatchConfirm, setShowMismatchConfirm] = useState(false)
    const [switchAfterSave, setSwitchAfterSave] = useState(false)
    const [closeAfterSave, setCloseAfterSave] = useState(false)
    const [pendingSwitchTarget, setPendingSwitchTarget] = useState<BeatmapSetSummary | null>(null)

    useEffect(() => {
      void window.api.getSettings().then((settings) => {
        setTagSectionsExpanded(settings.tagSectionsExpanded)
      })
    }, [])

    const loadSelectedMetadata = useCallback(async (): Promise<void> => {
      setImportedWebBeatmapSetId(null)
      setIsOnOsuWebsite(false)
      setStatus(null)
      setLoadingMeta(true)
      try {
        const loaded = await window.api.loadMetadata(selected.folderPath)
        setMetadata(loaded.metadata)
        setSavedMetadata(loaded.metadata)
        setComboColours(loaded.comboColours)
        setSavedComboColours(loaded.comboColours)
        setDifficulties(loaded.difficulties)
        setCreator(loaded.creator)
        setIsFeaturedArtist(loaded.isFeaturedArtist)
        setFeaturedArtistContext(
          getFeaturedArtistContext(loaded.isFeaturedArtist, loaded.metadata.tags)
        )
        setIsOnOsuWebsite(loaded.isOnOsuWebsite)
        setMismatched(loaded.mismatched)
        setMismatchedFields(loaded.mismatchedFields)
        setMetadataMismatchDetails(loaded.metadataMismatchDetails)
        setComboColoursMismatched(loaded.comboColoursMismatched)
        setComboColourMismatchDetails(loaded.comboColourMismatchDetails)
      } catch (err) {
        setStatus(err instanceof Error ? err.message : 'Failed to load metadata.')
      } finally {
        setLoadingMeta(false)
      }
    }, [selected.folderPath])

    useEffect(() => {
      void loadSelectedMetadata()
    }, [loadSelectedMetadata])

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
        supportsComboColours && !comboColoursEqual(comboColours, savedComboColours)
      return metadataDirty || comboDirty
    }, [metadata, savedMetadata, comboColours, savedComboColours, supportsComboColours])

    useEffect(() => {
      onDirtyChange(isDirty)
    }, [isDirty, onDirtyChange])

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

    const performSave = useCallback(async (): Promise<void> => {
      if (savedMetadata === null || savedComboColours === null) return
      if (saving) return

      const folderPath = selected.folderPath
      const nextSet = switchAfterSave ? pendingSwitchTarget : null
      const shouldClose = closeAfterSave

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
        setMetadataMismatchDetails(loaded.metadataMismatchDetails)
        setComboColoursMismatched(loaded.comboColoursMismatched)
        setComboColourMismatchDetails(loaded.comboColourMismatchDetails)
        setIsFeaturedArtist(loaded.isFeaturedArtist)
        setFeaturedArtistContext(
          getFeaturedArtistContext(loaded.isFeaturedArtist, loaded.metadata.tags)
        )

        const sets = await loadBeatmaps()
        const refreshed = sets.find((b) => b.folderPath === folderPath)
        if (refreshed) onSelectedRefresh(refreshed)

        setShowMismatchConfirm(false)
        setShowSaveSafety(false)
        setSwitchAfterSave(false)
        setCloseAfterSave(false)
        setPendingSwitchTarget(null)

        if (nextSet) {
          onNavigateTo(nextSet)
        } else if (shouldClose) {
          void window.api.confirmAppClose()
        }
      } catch (err) {
        const failMessage = err instanceof Error ? err.message : 'Unknown error'
        setStatus(`Failed: ${failMessage}`)
        notifyError(`Save failed: ${failMessage}`)
      } finally {
        setSaving(false)
      }
    }, [
      savedMetadata,
      savedComboColours,
      saving,
      selected.folderPath,
      metadata,
      comboColours,
      switchAfterSave,
      closeAfterSave,
      pendingSwitchTarget,
      loadBeatmaps,
      onNavigateTo,
      onSelectedRefresh
    ])

    const handleSave = useCallback((): void => {
      setSwitchAfterSave(false)
      setCloseAfterSave(false)
      setPendingSwitchTarget(null)
      setShowSaveSafety(true)
    }, [])

    const cancelSaveFlow = useCallback((): void => {
      setSwitchAfterSave(false)
      setCloseAfterSave(false)
      setPendingSwitchTarget(null)
      setShowSaveSafety(false)
      setShowMismatchConfirm(false)
    }, [])

    const confirmSaveSafety = useCallback((): void => {
      if (saving) return
      if (needsMismatchConfirm) {
        setShowSaveSafety(false)
        setShowMismatchConfirm(true)
        return
      }
      void performSave()
    }, [needsMismatchConfirm, performSave, saving])

    const saveForNavigation = useCallback(
      (options: { switchTo?: BeatmapSetSummary | null; closeAfter?: boolean }): void => {
        setSwitchAfterSave(Boolean(options.switchTo))
        setCloseAfterSave(Boolean(options.closeAfter))
        setPendingSwitchTarget(options.switchTo ?? null)
        setShowSaveSafety(true)
      },
      []
    )

    useImperativeHandle(
      ref,
      () => ({
        requestSave: handleSave,
        saveForNavigation
      }),
      [handleSave, saveForNavigation]
    )

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

    const openSelectedFolder = (): void => {
      void window.api.openBeatmapFolder(selected.folderPath).catch((err) => {
        setStatus(err instanceof Error ? err.message : 'Failed to open folder.')
      })
    }

    const openSelectedBeatmapPage = (): void => {
      const setId = resolveBeatmapSetId(selected)
      if (setId == null) return
      void window.api.openBeatmapPage(setId).catch((err) => {
        setStatus(err instanceof Error ? err.message : 'Failed to open beatmap page.')
      })
    }

    return (
      <>
        <MetadataEditor
          selected={selected}
          metadata={metadata}
          difficulties={difficulties}
          creator={creator}
          isFeaturedArtist={isFeaturedArtist}
          featuredArtistContext={featuredArtistContext}
          isOnOsuWebsite={isOnOsuWebsite}
          mismatched={mismatched}
          metadataMismatchDetails={metadataMismatchDetails}
          comboColourMismatchDetails={comboColourMismatchDetails}
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
          onRevert={() => void loadSelectedMetadata()}
          onOpenFolder={openSelectedFolder}
          onOpenBeatmapPage={openSelectedBeatmapPage}
          onOpenImportModal={() => setShowImportModal(true)}
          importedWebBeatmapSetId={importedWebBeatmapSetId}
        />

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
          opened={showMismatchConfirm}
          onClose={cancelSaveFlow}
          title="Unify mismatched difficulties?"
          {...appModalProps}
        >
          <Stack gap="md" className="mv-modal-stagger">
            <Text size="sm">
              Some difficulties differ in the fields you are saving. Your current editor values will
              be written to every .osu file in this set for those fields only.
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
              <Button onClick={() => void performSave()} loading={saving} disabled={saving}>
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
)

export default BeatmapWorkspace
