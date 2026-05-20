import {
  Alert,
  Box,
  Badge,
  Button,
  CloseButton,
  Group,
  Loader,
  Modal,
  Paper,
  ScrollArea,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
  ThemeIcon,
  Tooltip,
  UnstyledButton
} from '@mantine/core'
import { useDebouncedValue } from '@mantine/hooks'
import {
  IconAlertTriangle,
  IconArrowLeft,
  IconChevronRight,
  IconMusic,
  IconTags,
  IconTypography
} from '@tabler/icons-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { filterBeatmaps } from '@shared/filter-beatmaps'
import {
  buildImportComboPreview,
  buildImportPreview,
  importPreviewHasChanges
} from '@shared/metadata-import-preview'
import {
  beatmapsetStatusColor,
  beatmapsetStatusLabel,
  formatLeaderboardDateAt
} from '@shared/osu-beatmap-status'
import {
  beatmapGameModeLabel,
  beatmapsetSupportsComboColours,
  gameModesFromModeInts,
  gameModesFromModeNames,
  type OsuGameMode
} from '@shared/osu-game-mode'
import GameModeIcon from '../common/GameModeIcon'
import type {
  BeatmapComboColour,
  BeatmapMetadata,
  BeatmapSetSummary,
  ImportMetadataMode,
  ImportMetadataSource,
  ImportSourceData,
  OsuBeatmapsetSearchHit
} from '@shared/types'
import BeatmapCard from '../beatmaps/BeatmapCard'
import { modalClassNames, modalOverlayProps, modalTransitionProps } from '../../theme/modal'
import { parseDisplayName } from '../../utils/parseDisplayName'

export type { ImportMetadataMode } from '@shared/types'

function buildDefaultImportSearch(metadata: BeatmapMetadata): string {
  const artist = metadata.artistUnicode.trim() || metadata.artist.trim()
  const title = metadata.titleUnicode.trim() || metadata.title.trim()
  if (artist && title) return `${artist} ${title}`
  return artist || title
}

interface ImportOption {
  mode: ImportMetadataMode
  title: string
  description: string
  icon: typeof IconTypography
  color: string
}

const IMPORT_OPTIONS: ImportOption[] = [
  {
    mode: 'full',
    title: 'Import full metadata',
    description:
      'Artist, romanized artist, title, romanized title, source, and tags — all fields replaced.',
    icon: IconTypography,
    color: 'primary'
  },
  {
    mode: 'tags',
    title: 'Import tags only',
    description: 'Replace your tag field with the source map’s tags. Artist and title stay unchanged.',
    icon: IconTags,
    color: 'teal'
  },
  {
    mode: 'song',
    title: 'Import song metadata',
    description: 'Replace artist and title fields (unicode and romanized) and source. Tags stay unchanged.',
    icon: IconMusic,
    color: 'grape'
  }
]

type ImportPick =
  | { kind: 'local'; beatmap: BeatmapSetSummary }
  | { kind: 'web'; hit: OsuBeatmapsetSearchHit }

interface ImportMetadataModalProps {
  opened: boolean
  onClose: () => void
  beatmaps: BeatmapSetSummary[]
  currentFolderPath: string
  currentMetadata: BeatmapMetadata
  currentComboColours: BeatmapComboColour[]
  currentGameModes: OsuGameMode[]
  importing: boolean
  onImport: (source: ImportMetadataSource, mode: ImportMetadataMode, includeComboColours: boolean) => void
}

export function applyMetadataImport(
  current: BeatmapMetadata,
  source: BeatmapMetadata,
  mode: ImportMetadataMode
): BeatmapMetadata {
  if (mode === 'full') {
    return { ...source }
  }
  if (mode === 'tags') {
    return { ...current, tags: source.tags }
  }
  return {
    ...current,
    artist: source.artist,
    artistUnicode: source.artistUnicode,
    title: source.title,
    titleUnicode: source.titleUnicode,
    source: source.source
  }
}

async function loadSourceImportData(pick: ImportPick): Promise<ImportSourceData> {
  if (pick.kind === 'local') {
    const loaded = await window.api.loadMetadata(pick.beatmap.folderPath)
    return {
      metadata: loaded.metadata,
      comboColours: loaded.comboColours,
      gameModes: gameModesFromModeInts(loaded.difficulties.map((d) => d.mode))
    }
  }
  return window.api.loadImportSourceFromBeatmapSet(pick.hit.beatmapSetId)
}

function ComboSwatches({ colours }: { colours: BeatmapComboColour[] }): JSX.Element {
  if (colours.length === 0) {
    return (
      <Text size="sm" c="dimmed" fs="italic">
        (none)
      </Text>
    )
  }

  return (
    <Group gap={6} wrap="wrap" className="mv-swatch-stagger">
      {colours.map((colour, index) => (
        <Box
          key={index}
          w={22}
          h={22}
          style={{
            borderRadius: 4,
            background: `rgb(${colour.r}, ${colour.g}, ${colour.b})`,
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.35)'
          }}
        />
      ))}
    </Group>
  )
}

function ImportSourceHero({
  artist,
  title,
  subtitle,
  coverUrl
}: {
  artist: string
  title: string
  subtitle: string
  coverUrl?: string | null
}): JSX.Element {
  return (
    <Paper radius="lg" p={0} className="mv-import-hero" style={{ overflow: 'hidden' }}>
      <Box
        className="mv-import-hero__bg"
        style={{
          height: 128,
          backgroundImage: coverUrl ? `url('${coverUrl}')` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundColor: 'var(--mantine-color-dark-6)'
        }}
      />
      <Box className="mv-import-hero__shade" />
      <Stack gap={6} p="lg" className="mv-import-hero__text">
        <Text fw={700} size="lg" lh={1.25}>
          {artist}
        </Text>
        {title ? (
          <Text size="md" c="dimmed" lh={1.3}>
            {title}
          </Text>
        ) : null}
        <Text size="xs" c="dimmed" mt={4}>
          {subtitle}
        </Text>
      </Stack>
    </Paper>
  )
}

function BeatmapsetStatusBadge({ status }: { status: string }): JSX.Element {
  return (
    <Badge size="xs" variant="filled" color={beatmapsetStatusColor(status)}>
      {beatmapsetStatusLabel(status)}
    </Badge>
  )
}

function BeatmapsetGameModeIcons({ modes }: { modes: string[] }): JSX.Element {
  return (
    <Group gap={4} wrap="nowrap">
      {modes.map((mode) => (
        <Tooltip key={mode} label={beatmapGameModeLabel(mode)}>
          <Box
            style={{
              width: 26,
              height: 26,
              borderRadius: 6,
              background: 'rgba(0, 0, 0, 0.55)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <GameModeIcon mode={mode} size={20} />
          </Box>
        </Tooltip>
      ))}
    </Group>
  )
}

function WebBeatmapPickCard({
  hit,
  onSelect
}: {
  hit: OsuBeatmapsetSearchHit
  onSelect: () => void
}): JSX.Element {
  const artist = hit.artistUnicode.trim() || hit.artist
  const title = hit.titleUnicode.trim() || hit.title
  const leaderboardDate = formatLeaderboardDateAt(hit.status, hit.leaderboardDateAt)

  return (
    <UnstyledButton onClick={onSelect} style={{ width: '100%' }}>
      <Paper
        radius="md"
        p={0}
        style={{
          overflow: 'hidden',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          cursor: 'pointer'
        }}
      >
        <Box
          style={{
            height: 72,
            position: 'relative',
            backgroundImage: hit.coverUrl ? `url('${hit.coverUrl}')` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundColor: 'var(--mantine-color-dark-6)'
          }}
        >
          <Box style={{ position: 'absolute', top: 6, left: 6 }}>
            <BeatmapsetGameModeIcons modes={hit.gameModes} />
          </Box>
          <Box style={{ position: 'absolute', top: 6, right: 6 }}>
            <BeatmapsetStatusBadge status={hit.status} />
          </Box>
        </Box>
        <Stack gap={2} p="xs">
          <Text size="xs" fw={600} lineClamp={1}>
            {artist}
          </Text>
          <Text size="xs" c="dimmed" lineClamp={1}>
            {title}
          </Text>
          <Text size="xs" c="dimmed">
            by {hit.creator}
          </Text>
          {leaderboardDate ? (
            <Text size="xs" c="dimmed">
              {leaderboardDate}
            </Text>
          ) : null}
        </Stack>
      </Paper>
    </UnstyledButton>
  )
}

function PreviewValue({
  value,
  emptyLabel,
  className
}: {
  value: string
  emptyLabel: string
  className?: string
}): JSX.Element {
  const text = value.trim()
  if (!text) {
    return (
      <Text size="sm" c="dimmed" fs="italic" className={className}>
        {emptyLabel}
      </Text>
    )
  }
  return (
    <Text
      size="sm"
      className={className}
      style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
    >
      {text}
    </Text>
  )
}

function ImportPreviewColumn({
  side,
  changed,
  children
}: {
  side: 'current' | 'after'
  changed: boolean
  children: ReactNode
}): JSX.Element {
  const label = side === 'current' ? 'Current' : 'After import'
  const colClass = [
    'mv-import-preview-col',
    side === 'current' ? 'mv-import-preview-col--current' : 'mv-import-preview-col--after',
    side === 'after' && changed ? 'mv-import-preview-col--after-changed' : ''
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <Box className={colClass}>
      <Text size="xs" fw={700} tt="uppercase" className="mv-import-preview-col-label">
        {label}
      </Text>
      {children}
    </Box>
  )
}

function ImportPreviewStep({
  mode,
  currentMetadata,
  sourceMetadata,
  currentComboColours,
  sourceComboColours,
  importing,
  stepDirection,
  canImportComboColours,
  onBack,
  onConfirm
}: {
  mode: ImportMetadataMode
  currentMetadata: BeatmapMetadata
  sourceMetadata: BeatmapMetadata
  currentComboColours: BeatmapComboColour[]
  sourceComboColours: BeatmapComboColour[]
  importing: boolean
  stepDirection: 'forward' | 'back'
  canImportComboColours: boolean
  onBack: () => void
  onConfirm: (includeComboColours: boolean) => void
}): JSX.Element {
  const [includeComboColours, setIncludeComboColours] = useState(false)

  useEffect(() => {
    setIncludeComboColours(false)
  }, [mode, sourceMetadata, canImportComboColours])

  const previews = useMemo(
    () => buildImportPreview(currentMetadata, sourceMetadata, mode),
    [currentMetadata, sourceMetadata, mode]
  )
  const comboPreview = useMemo(
    () => buildImportComboPreview(currentComboColours, sourceComboColours),
    [currentComboColours, sourceComboColours]
  )
  const activeComboPreview = includeComboColours ? comboPreview : null
  const hasChanges = importPreviewHasChanges(previews, activeComboPreview)
  const option = IMPORT_OPTIONS.find((entry) => entry.mode === mode)
  const sourceHasComboColours = sourceComboColours.length > 0

  return (
    <Stack
      gap="md"
      className={`mv-step-enter mv-step-enter--${stepDirection}`}
    >
      <UnstyledButton className="mv-text-button" onClick={onBack} disabled={importing}>
        <Group gap={6} wrap="nowrap">
          <IconArrowLeft size={16} />
          <Text size="sm" fw={500}>
            Choose another import type
          </Text>
        </Group>
      </UnstyledButton>

      <Text fw={600} size="md">
        {option?.title ?? 'Import preview'}
      </Text>
      <Text size="sm" c="dimmed">
        Review what will change in your editor. Nothing is saved until you click Import.
      </Text>

      <Group gap="md" className="mv-import-preview-legend">
        <Group gap={6} wrap="nowrap">
          <Box className="mv-import-preview-legend-swatch mv-import-preview-legend-swatch--current" />
          <Text size="xs" fw={600}>
            Your map (current)
          </Text>
        </Group>
        <Group gap={6} wrap="nowrap">
          <Box className="mv-import-preview-legend-swatch mv-import-preview-legend-swatch--after" />
          <Text size="xs" fw={600}>
            After import
          </Text>
        </Group>
      </Group>

      <ScrollArea.Autosize mah={380} offsetScrollbars type="auto">
        <Stack gap="sm" className="mv-stagger-children mv-import-preview-list">
          {previews.map(({ label, current, next, changed }) => (
              <Paper
                key={label}
                p="sm"
                radius="md"
                className={
                  changed
                    ? 'mv-import-preview-field mv-import-preview-field--changed'
                    : 'mv-import-preview-field mv-import-preview-field--unchanged'
                }
              >
                <Group justify="space-between" mb="xs" wrap="nowrap">
                  <Text size="xs" fw={700} tt="uppercase" className="mv-import-preview-field-name">
                    {label}
                  </Text>
                  {changed ? (
                    <Badge size="xs" color="yellow" variant="filled" className="mv-badge-will-change">
                      Will change
                    </Badge>
                  ) : (
                    <Badge size="xs" color="gray" variant="outline">
                      Unchanged
                    </Badge>
                  )}
                </Group>
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
                  <ImportPreviewColumn side="current" changed={changed}>
                    <PreviewValue value={current} emptyLabel="(empty)" />
                  </ImportPreviewColumn>
                  <ImportPreviewColumn side="after" changed={changed}>
                    <PreviewValue
                      value={next}
                      emptyLabel="(empty)"
                      className={changed ? 'mv-import-preview-value--changed' : undefined}
                    />
                  </ImportPreviewColumn>
                </SimpleGrid>
              </Paper>
            ))}

          {canImportComboColours ? (
            <Paper p="sm" radius="md" className="mv-import-preview-field mv-import-preview-field--combo">
              <Switch
                checked={includeComboColours}
                onChange={(event) => setIncludeComboColours(event.currentTarget.checked)}
                disabled={importing}
                label={
                  <Stack gap={2}>
                    <Text size="sm" fw={500}>
                      Also import combo colours from source
                    </Text>
                    <Text size="xs" c="dimmed" lh={1.45}>
                      {sourceHasComboColours
                        ? 'Optional — copies the source map’s [Colours] section into your editor.'
                        : 'The source map has no combo colours in [Colours]. Turning this on will clear combo colours in your editor.'}
                    </Text>
                  </Stack>
                }
                styles={{ body: { alignItems: 'flex-start' } }}
              />

              {includeComboColours ? (
                <Box
                  mt="md"
                  className={`mv-combo-reveal mv-import-preview-field ${
                    comboPreview.changed
                      ? 'mv-import-preview-field--changed'
                      : 'mv-import-preview-field--unchanged'
                  }`}
                >
                  <Group justify="space-between" mb="xs" wrap="nowrap">
                    <Text size="xs" fw={700} tt="uppercase" className="mv-import-preview-field-name">
                      Combo colours ({comboPreview.current.length} → {comboPreview.next.length})
                    </Text>
                    {comboPreview.changed ? (
                      <Badge size="xs" color="yellow" variant="filled" className="mv-badge-will-change">
                        Will change
                      </Badge>
                    ) : (
                      <Badge size="xs" color="gray" variant="outline">
                        Unchanged
                      </Badge>
                    )}
                  </Group>
                  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
                    <ImportPreviewColumn side="current" changed={comboPreview.changed}>
                      <ComboSwatches colours={comboPreview.current} />
                    </ImportPreviewColumn>
                    <ImportPreviewColumn side="after" changed={comboPreview.changed}>
                      <ComboSwatches colours={comboPreview.next} />
                    </ImportPreviewColumn>
                  </SimpleGrid>
                </Box>
              ) : null}
            </Paper>
          ) : null}
        </Stack>
      </ScrollArea.Autosize>

      <Group justify="flex-end" gap="sm">
        <Button variant="default" onClick={onBack} disabled={importing}>
          Back
        </Button>
        <Button
          onClick={() => onConfirm(canImportComboColours ? includeComboColours : false)}
          loading={importing}
          disabled={!hasChanges}
        >
          Import
        </Button>
      </Group>
    </Stack>
  )
}

function ImportOptionsStep({
  picked,
  importing,
  stepDirection,
  onBack,
  onSelectMode
}: {
  picked: ImportPick
  importing: boolean
  stepDirection: 'forward' | 'back'
  onBack: () => void
  onSelectMode: (mode: ImportMetadataMode) => void
}): JSX.Element {
  const hero =
    picked.kind === 'local'
      ? {
          artist: parseDisplayName(picked.beatmap.displayName, picked.beatmap.folderName).artist,
          title: parseDisplayName(picked.beatmap.displayName, picked.beatmap.folderName).title,
          subtitle: `${picked.beatmap.diffCount} difficult${picked.beatmap.diffCount === 1 ? 'y' : 'ies'} · local library`,
          coverUrl: picked.beatmap.backgroundImageUrl
        }
      : {
          artist: picked.hit.artistUnicode.trim() || picked.hit.artist,
          title: picked.hit.titleUnicode.trim() || picked.hit.title,
          subtitle: [
            `by ${picked.hit.creator}`,
            formatLeaderboardDateAt(picked.hit.status, picked.hit.leaderboardDateAt),
            `osu! set #${picked.hit.beatmapSetId}`
          ]
            .filter(Boolean)
            .join(' · '),
          coverUrl: picked.hit.coverUrl
        }

  return (
    <Stack gap="xl" className={`mv-step-enter mv-step-enter--${stepDirection}`}>
      <UnstyledButton className="mv-text-button" onClick={onBack} disabled={importing}>
        <Group gap={6} wrap="nowrap">
          <IconArrowLeft size={16} />
          <Text size="sm" fw={500}>
            Choose another mapset
          </Text>
        </Group>
      </UnstyledButton>

      <ImportSourceHero {...hero} />
      {picked.kind === 'web' ? (
        <Group gap="xs">
          <BeatmapsetStatusBadge status={picked.hit.status} />
          <Text size="xs" c="dimmed">
            Leaderboard map
          </Text>
        </Group>
      ) : null}

      <Stack gap="xs">
        <Text fw={600} size="md">
          What do you want to import?
        </Text>
        <Text size="sm" c="dimmed" lh={1.55}>
          Each option <Text span fw={600} c="bright">replaces</Text> your current values — nothing is
          merged in.
        </Text>
      </Stack>

      <Stack gap="sm" className="mv-import-options-stagger">
        {IMPORT_OPTIONS.map((option) => (
          <UnstyledButton
            key={option.mode}
            className="mv-import-option"
            disabled={importing}
            onClick={() => onSelectMode(option.mode)}
            aria-busy={importing}
          >
            <Group wrap="nowrap" align="flex-start" gap="md">
              <ThemeIcon size={44} radius="md" variant="light" color={option.color}>
                <option.icon size={22} stroke={1.6} />
              </ThemeIcon>
              <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
                <Text fw={600} size="md" lh={1.3}>
                  {option.title}
                </Text>
                <Text size="sm" c="dimmed" lh={1.5}>
                  {option.description}
                </Text>
              </Stack>
              <IconChevronRight
                size={20}
                style={{ flexShrink: 0, opacity: 0.45, marginTop: 4 }}
                aria-hidden
              />
            </Group>
          </UnstyledButton>
        ))}
      </Stack>
    </Stack>
  )
}

export default function ImportMetadataModal({
  opened,
  onClose,
  beatmaps,
  currentFolderPath,
  currentMetadata,
  currentComboColours,
  currentGameModes,
  importing,
  onImport
}: ImportMetadataModalProps): JSX.Element {
  const [search, setSearch] = useState('')
  const [picked, setPicked] = useState<ImportPick | null>(null)
  const [selectedMode, setSelectedMode] = useState<ImportMetadataMode | null>(null)
  const [sourceMetadata, setSourceMetadata] = useState<BeatmapMetadata | null>(null)
  const [sourceComboColours, setSourceComboColours] = useState<BeatmapComboColour[]>([])
  const [sourceGameModes, setSourceGameModes] = useState<OsuGameMode[]>([])
  const [sourceLoading, setSourceLoading] = useState(false)
  const [sourceLoadError, setSourceLoadError] = useState<string | null>(null)
  const [webResults, setWebResults] = useState<OsuBeatmapsetSearchHit[]>([])
  const [webLoading, setWebLoading] = useState(false)
  const [debouncedSearch] = useDebouncedValue(search.trim(), 350)
  const [stepDirection, setStepDirection] = useState<'forward' | 'back'>('forward')
  const wasOpenedRef = useRef(false)

  const candidates = useMemo(
    () => beatmaps.filter((bm) => bm.folderPath !== currentFolderPath),
    [beatmaps, currentFolderPath]
  )

  const filtered = useMemo(() => filterBeatmaps(candidates, search), [candidates, search])

  useEffect(() => {
    const justOpened = opened && !wasOpenedRef.current
    wasOpenedRef.current = opened
    if (!justOpened) return

    setSearch(buildDefaultImportSearch(currentMetadata))
    setPicked(null)
    setSelectedMode(null)
    setSourceMetadata(null)
    setSourceComboColours([])
    setSourceGameModes([])
    setSourceLoading(false)
    setSourceLoadError(null)
    setWebResults([])
    setStepDirection('forward')
  }, [opened, currentMetadata])

  useEffect(() => {
    if (!opened || debouncedSearch.length === 0) {
      setWebResults([])
      setWebLoading(false)
      return
    }

    let cancelled = false
    setWebLoading(true)

    void window.api.searchBeatmapsetsOnOsu(debouncedSearch).then((results) => {
      if (!cancelled) setWebResults(results)
    }).finally(() => {
      if (!cancelled) setWebLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [opened, debouncedSearch])

  const handleClose = (): void => {
    setSearch('')
    setPicked(null)
    setSelectedMode(null)
    setSourceMetadata(null)
    setSourceComboColours([])
    setSourceGameModes([])
    setSourceLoading(false)
    setSourceLoadError(null)
    setWebResults([])
    onClose()
  }

  const currentSupportsComboColours = beatmapsetSupportsComboColours(currentGameModes)
  const sourceSupportsComboColours = beatmapsetSupportsComboColours(sourceGameModes)
  const canImportComboColours =
    currentSupportsComboColours && sourceSupportsComboColours

  const loadPreviewMetadata = (pick: ImportPick, mode: ImportMetadataMode): void => {
    setStepDirection('forward')
    setSelectedMode(mode)
    setSourceMetadata(null)
    setSourceComboColours([])
    setSourceGameModes(
      pick.kind === 'web' ? gameModesFromModeNames(pick.hit.gameModes) : []
    )
    setSourceLoadError(null)
    setSourceLoading(true)

    void loadSourceImportData(pick)
      .then((source) => {
        setSourceMetadata(source.metadata)
        setSourceComboColours(source.comboColours)
        setSourceGameModes(
          pick.kind === 'web'
            ? gameModesFromModeNames(pick.hit.gameModes)
            : gameModesFromModeNames(source.gameModes)
        )
      })
      .catch((err) => {
        setSourceMetadata(null)
        setSourceComboColours([])
        setSourceGameModes([])
        setSourceLoadError(
          err instanceof Error ? err.message : 'Failed to load source metadata.'
        )
      })
      .finally(() => setSourceLoading(false))
  }

  const handleSelectMode = (mode: ImportMetadataMode): void => {
    if (!picked) return
    loadPreviewMetadata(picked, mode)
  }

  const retrySourceLoad = (): void => {
    if (!picked || !selectedMode) return
    loadPreviewMetadata(picked, selectedMode)
  }

  const handleConfirmImport = (includeComboColours: boolean): void => {
    if (!picked || !selectedMode) return
    if (picked.kind === 'local') {
      onImport({ kind: 'local', folderPath: picked.beatmap.folderPath }, selectedMode, includeComboColours)
      return
    }
    onImport({ kind: 'web', beatmapSetId: picked.hit.beatmapSetId }, selectedMode, includeComboColours)
  }

  const modalTitle = selectedMode
    ? 'Import preview'
    : picked
      ? 'Import metadata'
      : 'Import from mapset'

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={modalTitle}
      size={selectedMode ? 'lg' : picked ? 'md' : 'lg'}
      centered
      overlayProps={modalOverlayProps}
      transitionProps={modalTransitionProps}
      classNames={{
        ...modalClassNames,
        body: picked ? 'mv-modal-body-options mv-modal-body' : 'mv-modal-body-picker mv-modal-body'
      }}
    >
      {sourceLoading ? (
        <Stack align="center" py="xl" gap="sm">
          <Loader size="sm" />
          <Text size="sm" c="dimmed">
            Loading source metadata…
          </Text>
        </Stack>
      ) : picked && selectedMode && sourceLoadError ? (
        <Stack gap="md" className="mv-step-enter">
          <UnstyledButton
            className="mv-text-button"
            onClick={() => {
              setSelectedMode(null)
              setSourceLoadError(null)
            }}
          >
            <Group gap={6} wrap="nowrap">
              <IconArrowLeft size={16} />
              <Text size="sm" fw={500}>
                Choose another import type
              </Text>
            </Group>
          </UnstyledButton>
          <Alert icon={<IconAlertTriangle size={16} />} color="red" variant="light">
            {sourceLoadError}
          </Alert>
          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={() => {
              setSelectedMode(null)
              setSourceLoadError(null)
            }}>
              Back
            </Button>
            <Button onClick={retrySourceLoad}>Retry</Button>
          </Group>
        </Stack>
      ) : picked && selectedMode && sourceMetadata ? (
        <ImportPreviewStep
          mode={selectedMode}
          currentMetadata={currentMetadata}
          sourceMetadata={sourceMetadata}
          currentComboColours={currentComboColours}
          sourceComboColours={sourceComboColours}
          importing={importing}
          stepDirection={stepDirection}
          canImportComboColours={canImportComboColours}
          onBack={() => {
            setStepDirection('back')
            setSelectedMode(null)
            setSourceMetadata(null)
            setSourceComboColours([])
            setSourceGameModes([])
            setSourceLoadError(null)
          }}
          onConfirm={handleConfirmImport}
        />
      ) : picked ? (
        <ImportOptionsStep
          picked={picked}
          importing={importing}
          stepDirection={stepDirection}
          onBack={() => {
            setStepDirection('back')
            setSourceGameModes([])
            setPicked(null)
          }}
          onSelectMode={handleSelectMode}
        />
      ) : (
        <Stack gap="md" className="mv-step-enter mv-step-enter--forward">
          <Text size="sm" c="dimmed" lh={1.5}>
            For the most accurate matches, search artist then song name.
          </Text>
          <TextInput
            placeholder="Artist song name…"
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            rightSection={
              <CloseButton
                aria-label="Clear search"
                onClick={() => setSearch('')}
                style={{ display: search ? undefined : 'none' }}
              />
            }
          />

          <Stack gap="xs">
            <Text size="xs" fw={600} c="dimmed" tt="uppercase">
              Your library
            </Text>
            {filtered.length === 0 ? (
              <Text size="sm" c="dimmed" ta="center" py="md">
                {candidates.length === 0
                  ? 'No other mapsets in your library.'
                  : 'No local mapsets match your search.'}
              </Text>
            ) : (
              <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="sm" verticalSpacing="sm">
                {filtered.map((bm) => (
                  <BeatmapCard
                    key={bm.folderPath}
                    beatmap={bm}
                    variant="picker"
                    isSelected={false}
                    isHighlighted={false}
                    onSelectFolder={() => {
                      setStepDirection('forward')
                      setSourceGameModes([])
                      setPicked({ kind: 'local', beatmap: bm })
                    }}
                  />
                ))}
              </SimpleGrid>
            )}
          </Stack>

          {debouncedSearch.length > 0 && (
            <Stack gap="xs">
              <Group justify="space-between" align="center">
                <Stack gap={2}>
                  <Text size="xs" fw={600} c="dimmed" tt="uppercase">
                    osu! website
                  </Text>
                  <Text size="xs" c="dimmed">
                    Sorted by match, then ranked/loved/qualified date.
                  </Text>
                </Stack>
                {webLoading ? <Loader size={16} /> : null}
              </Group>
              {!webLoading && webResults.length === 0 ? (
                <Text size="sm" c="dimmed" ta="center" py="md">
                  No ranked, loved, or qualified sets on osu! for this search.
                </Text>
              ) : (
                <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="sm" verticalSpacing="sm">
                  {webResults.map((hit) => (
                    <WebBeatmapPickCard
                      key={hit.beatmapSetId}
                      hit={hit}
                      onSelect={() => {
                        setStepDirection('forward')
                        setSourceGameModes(gameModesFromModeNames(hit.gameModes))
                        setPicked({ kind: 'web', hit })
                      }}
                    />
                  ))}
                </SimpleGrid>
              )}
            </Stack>
          )}
        </Stack>
      )}
    </Modal>
  )
}
