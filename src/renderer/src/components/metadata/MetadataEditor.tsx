import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Collapse,
  Group,
  Paper,
  Skeleton,
  Stack,
  Text,
  TextInput,
  UnstyledButton,
  Tooltip,
  useMantineTheme
} from '@mantine/core'
import {
  IconAlertTriangle,
  IconChevronRight,
  IconCopy,
  IconFolderOpen,
  IconWorld
} from '@tabler/icons-react'
import { useMemo, useState } from 'react'
import { beatmapSetPageUrl, resolveBeatmapSetId } from '@shared/beatmap-set-id'
import { formatDiscussionMetadataExport } from '@shared/discussion-metadata-export'
import { getMetadataValidationIssues } from '@shared/metadata-validation'
import { getRomanizedFieldLocks, isAlreadyRomanized } from '@shared/romanization'
import type {
  BeatmapComboColour,
  BeatmapDifficultySummary,
  BeatmapMetadata,
  BeatmapSetSummary,
  TagSectionsExpanded
} from '@shared/types'
import { beatmapsetSupportsComboColours, gameModesFromModeInts } from '@shared/osu-game-mode'
import { parseDisplayName } from '../../utils/parseDisplayName'
import DifficultyList from './DifficultyList'
import TagsField from './TagsField'
import SourceField from './SourceField'
import ComboColoursEditor from './ComboColoursEditor'

function formatLastModified(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  })
}

interface MetadataEditorProps {
  selected: BeatmapSetSummary
  metadata: BeatmapMetadata
  difficulties: BeatmapDifficultySummary[]
  difficultyVersions: string[]
  creator: string
  isFeaturedArtist: boolean
  isOnOsuWebsite: boolean
  mismatched: boolean
  comboColours: BeatmapComboColour[]
  comboColoursMismatched: boolean
  isDirty: boolean
  loading: boolean
  saving: boolean
  status: string | null
  tagSectionsExpanded: TagSectionsExpanded
  onTagSectionsExpandedChange: (value: TagSectionsExpanded) => void
  onChange: (metadata: BeatmapMetadata) => void
  onComboColoursChange: (colours: BeatmapComboColour[]) => void
  onSave: () => void
  onRevert: () => void
  onOpenFolder: () => void
  onOpenBeatmapPage: () => void
  onOpenImportModal: () => void
  importedWebBeatmapSetId: number | null
}

export default function MetadataEditor({
  selected,
  metadata,
  difficulties,
  difficultyVersions,
  creator,
  isFeaturedArtist,
  isOnOsuWebsite,
  mismatched,
  comboColours,
  comboColoursMismatched,
  isDirty,
  loading,
  saving,
  status,
  tagSectionsExpanded,
  onTagSectionsExpandedChange,
  onChange,
  onComboColoursChange,
  onSave,
  onRevert,
  onOpenFolder,
  onOpenBeatmapPage,
  onOpenImportModal,
  importedWebBeatmapSetId
}: MetadataEditorProps): JSX.Element {
  const theme = useMantineTheme()
  const [comboOpen, setComboOpen] = useState(false)
  const [discussionCopied, setDiscussionCopied] = useState(false)
  const [importLinkCopied, setImportLinkCopied] = useState(false)
  const [setIdCopied, setSetIdCopied] = useState(false)
  const { artist: lockArtistRomanized, title: lockTitleRomanized } = useMemo(
    () => getRomanizedFieldLocks(metadata),
    [metadata.artistUnicode, metadata.titleUnicode]
  )

  const fallback = parseDisplayName(selected.displayName, selected.folderName)
  const displayArtist =
    metadata.artistUnicode.trim() || metadata.artist.trim() || fallback.artist
  const displayTitle =
    metadata.titleUnicode.trim() || metadata.title.trim() || fallback.title
  const displaySource = metadata.source.trim()
  const beatmapSetId = resolveBeatmapSetId(selected)
  const hasBg = Boolean(selected.backgroundImageUrl)
  const supportsComboColours = useMemo(
    () => beatmapsetSupportsComboColours(gameModesFromModeInts(difficulties.map((d) => d.mode))),
    [difficulties]
  )

  const validationIssues = useMemo(
    () =>
      getMetadataValidationIssues(metadata, {
        mismatched,
        comboColoursMismatched: supportsComboColours ? comboColoursMismatched : false
      }),
    [metadata, mismatched, comboColoursMismatched, supportsComboColours]
  )

  const update = (key: keyof BeatmapMetadata, value: string): void => {
    const next = { ...metadata, [key]: value }
    if (key === 'artistUnicode' && isAlreadyRomanized(value)) {
      next.artist = value
    }
    if (key === 'titleUnicode' && isAlreadyRomanized(value)) {
      next.title = value
    }
    onChange(next)
  }

  const copyDiscussionMetadata = async (): Promise<void> => {
    const text = formatDiscussionMetadataExport(metadata)
    try {
      await navigator.clipboard.writeText(text)
      setDiscussionCopied(true)
      window.setTimeout(() => setDiscussionCopied(false), 2000)
    } catch {
      setDiscussionCopied(false)
    }
  }

  const copyImportedWebLink = async (): Promise<void> => {
    if (importedWebBeatmapSetId == null) return
    try {
      await navigator.clipboard.writeText(beatmapSetPageUrl(importedWebBeatmapSetId))
      setImportLinkCopied(true)
      window.setTimeout(() => setImportLinkCopied(false), 2000)
    } catch {
      setImportLinkCopied(false)
    }
  }

  const copyBeatmapSetId = async (): Promise<void> => {
    if (beatmapSetId == null) return
    try {
      await navigator.clipboard.writeText(String(beatmapSetId))
      setSetIdCopied(true)
      window.setTimeout(() => setSetIdCopied(false), 2000)
    } catch {
      setSetIdCopied(false)
    }
  }

  const openImportedWebBeatmapPage = (): void => {
    if (importedWebBeatmapSetId == null) return
    void window.api.openBeatmapPage(importedWebBeatmapSetId)
  }

  if (loading) {
    return (
      <Stack gap="md" className="mv-beatmap-panel-stagger mv-skeleton-shimmer">
        <Skeleton height={160} radius="md" />
        <Paper p="md" radius="md" bg={theme.colors.dark[5]} className="mv-paper-surface">
          <Skeleton height={22} width="35%" mb="lg" />
          <Skeleton height={36} mb="sm" />
          <Skeleton height={36} mb="sm" />
          <Skeleton height={36} mb="sm" />
          <Skeleton height={120} mb="lg" />
          <Skeleton height={36} width={180} />
        </Paper>
      </Stack>
    )
  }

  return (
    <Stack gap="md" className="mv-beatmap-panel-stagger">
      <Paper
        p={0}
        radius="md"
        className="mv-paper-surface mv-editor-hero"
        style={{ overflow: 'hidden', position: 'relative', minHeight: 140 }}
      >
        <Box
          className="mv-editor-hero__bg"
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            backgroundImage: hasBg ? `url('${selected.backgroundImageUrl}')` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center top',
            backgroundColor: hasBg ? undefined : theme.colors.dark[6]
          }}
        />
        <Box
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background:
              'linear-gradient(180deg, rgba(15, 16, 20, 0.35) 0%, rgba(15, 16, 20, 0.92) 70%, var(--mantine-color-dark-7) 100%)'
          }}
        />
        <Stack gap={4} p="md" className="mv-stagger-children" style={{ position: 'relative', zIndex: 1 }}>
          <Group gap="sm" wrap="nowrap">
            <Text
              fw={700}
              size="xl"
              style={{ textShadow: '0 2px 12px rgba(0,0,0,0.5)', flex: 1, minWidth: 0 }}
            >
              {displayArtist}
              {displayTitle ? ` - ${displayTitle}` : ''}
            </Text>
            {isOnOsuWebsite && (
              <Tooltip label="Open web beatmap page">
                <span style={{ display: 'inline-flex', flexShrink: 0 }}>
                  <ActionIcon
                    variant="light"
                    color="gray"
                    size="sm"
                    aria-label="Open web beatmap page"
                    onClick={(e) => {
                      e.stopPropagation()
                      onOpenBeatmapPage()
                    }}
                  >
                    <IconWorld size={16} />
                  </ActionIcon>
                </span>
              </Tooltip>
            )}
            {isDirty && (
              <Badge color="yellow" variant="filled" style={{ flexShrink: 0 }}>
                Edited
              </Badge>
            )}
            {isFeaturedArtist && (
              <Badge color="grape" variant="light" style={{ flexShrink: 0 }}>
                FA
              </Badge>
            )}
          </Group>
          {displaySource ? (
            <Text
              size="sm"
              c="dimmed"
              style={{ textShadow: '0 1px 8px rgba(0,0,0,0.45)' }}
            >
              {displaySource}
            </Text>
          ) : null}
          {creator.trim() ? (
            <Text
              size="sm"
              c="dimmed"
              style={{ textShadow: '0 1px 8px rgba(0,0,0,0.45)' }}
            >
              by {creator.trim()}
            </Text>
          ) : null}
          <Group gap="xs" wrap="wrap">
            {beatmapSetId != null ? (
              <Tooltip label={setIdCopied ? 'Copied!' : 'Click to copy set ID'}>
                <UnstyledButton
                  className={setIdCopied ? 'mv-copy-flash' : undefined}
                  onClick={() => void copyBeatmapSetId()}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    borderRadius: 6,
                    padding: '2px 8px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    color: setIdCopied ? 'var(--mantine-color-green-4)' : 'var(--mantine-color-dimmed)'
                  }}
                >
                  <Text size="sm" fw={500} className="mv-font-difficulties">
                    #{beatmapSetId}
                  </Text>
                </UnstyledButton>
              </Tooltip>
            ) : null}
            <Text size="sm" c="dimmed" className="mv-font-difficulties">
              {selected.folderName} · {selected.diffCount} difficult
              {selected.diffCount === 1 ? 'y' : 'ies'}
              {selected.lastModifiedAt > 0
                ? ` · Updated ${formatLastModified(selected.lastModifiedAt)}`
                : ''}
            </Text>
          </Group>
          {selected.hiddenDuplicateCount > 0 && (
            <Text size="xs" c="yellow">
              Showing the newest of {selected.hiddenDuplicateCount + 1} copies on disk (BeatmapSetID{' '}
              {selected.beatmapSetId ?? 'unknown'}).
            </Text>
          )}
          <DifficultyList difficulties={difficulties} />
        </Stack>
      </Paper>

      <Paper p="md" radius="md" bg={theme.colors.dark[5]} className="mv-paper-surface">
        <Group justify="space-between" mb="md">
          <Text fw={600}>Metadata</Text>
          <Badge color="blue" variant="light">
            {selected.diffCount} difficult{selected.diffCount === 1 ? 'y' : 'ies'}
          </Badge>
        </Group>

        <Group mb="md" gap="sm">
          <Button variant="light" leftSection={<IconFolderOpen size={16} />} onClick={onOpenFolder}>
            Open folder
          </Button>
          <Button variant="light" leftSection={<IconCopy size={16} />} onClick={onOpenImportModal}>
            Import from mapset
          </Button>
        </Group>

        {importedWebBeatmapSetId != null ? (
          <Alert
            variant="light"
            color="blue"
            mb="md"
            icon={<IconWorld size={16} />}
            className="mv-alert-slide-down"
          >
            <Group justify="space-between" wrap="nowrap" gap="sm">
              <Text size="sm" style={{ flex: 1, minWidth: 0 }}>
                Metadata imported from osu! website
              </Text>
              <Group gap={6} wrap="nowrap">
                <Tooltip label="Open on osu!">
                  <ActionIcon
                    variant="light"
                    size="sm"
                    aria-label="Open on osu!"
                    onClick={openImportedWebBeatmapPage}
                  >
                    <IconWorld size={14} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="Copy beatmap link">
                  <ActionIcon
                    variant="light"
                    size="sm"
                    aria-label="Copy beatmap link"
                    onClick={() => void copyImportedWebLink()}
                  >
                    <IconCopy size={14} />
                  </ActionIcon>
                </Tooltip>
                {importLinkCopied ? (
                  <Text size="xs" c="green">
                    Copied!
                  </Text>
                ) : null}
              </Group>
            </Group>
          </Alert>
        ) : null}

        <Stack gap="md" className="mv-stagger-children" component="form" onSubmit={(e) => { e.preventDefault(); onSave() }}>
          {validationIssues.map((issue) => (
            <Alert
              key={issue.id}
              className="mv-alert-enter"
              icon={<IconAlertTriangle />}
              color={issue.severity === 'error' ? 'red' : 'yellow'}
              variant="light"
            >
              {issue.message}
              {issue.id === 'mismatched' || issue.id === 'combo-colours-mismatched'
                ? ' Saving will unify all .osu files in this set.'
                : ''}
            </Alert>
          ))}

          <Box className="mv-field-wrap">
            <Text size="xs" c="dimmed" mb={4}>
              Artist name
            </Text>
            <TextInput
              value={metadata.artistUnicode}
              onChange={(e) => update('artistUnicode', e.currentTarget.value)}
            />
          </Box>

          <Box className="mv-field-wrap">
            <Text size="xs" c="dimmed" mb={4}>
              Romanized artist name
            </Text>
            <TextInput
              value={metadata.artist}
              onChange={(e) => update('artist', e.currentTarget.value)}
              disabled={lockArtistRomanized}
            />
          </Box>

          <Box className="mv-field-wrap">
            <Text size="xs" c="dimmed" mb={4}>
              Song title
            </Text>
            <TextInput
              value={metadata.titleUnicode}
              onChange={(e) => update('titleUnicode', e.currentTarget.value)}
            />
          </Box>

          <Box className="mv-field-wrap">
            <Text size="xs" c="dimmed" mb={4}>
              Romanized song title
            </Text>
            <TextInput
              value={metadata.title}
              onChange={(e) => update('title', e.currentTarget.value)}
              disabled={lockTitleRomanized}
            />
          </Box>

          <SourceField
            selected={selected}
            metadata={metadata}
            onChange={(source) => update('source', source)}
          />

          <TagsField
            folderPath={selected.folderPath}
            tags={metadata.tags}
            artistUnicode={metadata.artistUnicode}
            artist={metadata.artist}
            titleUnicode={metadata.titleUnicode}
            title={metadata.title}
            folderName={selected.folderName}
            source={metadata.source}
            difficultyVersions={difficultyVersions}
            creator={creator}
            isFeaturedArtist={isFeaturedArtist}
            tagSectionsExpanded={tagSectionsExpanded}
            onTagSectionsExpandedChange={onTagSectionsExpandedChange}
            onChange={(tags) => update('tags', tags)}
          />

          {supportsComboColours ? (
            <Box mt="md">
              <UnstyledButton
                className={`mv-chevron-btn${comboOpen ? ' mv-chevron-btn--open' : ''}`}
                onClick={() => setComboOpen((value) => !value)}
                style={{
                  width: '100%',
                  borderRadius: 8,
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  background: 'rgba(255, 255, 255, 0.02)',
                  padding: '10px 12px'
                }}
              >
                <Group justify="space-between" wrap="nowrap">
                  <Group gap={8} wrap="nowrap">
                    <IconChevronRight size={16} stroke={2.75} className="mv-chevron-icon" />
                    <Text fw={600} size="sm">
                      Combo colours
                    </Text>
                  </Group>
                  <Badge variant="light" color="blue">
                    {comboColours.length}
                  </Badge>
                </Group>
              </UnstyledButton>

              <Collapse in={comboOpen} transitionDuration={220} mt="sm">
                <ComboColoursEditor colours={comboColours} onChange={onComboColoursChange} />
              </Collapse>
            </Box>
          ) : null}

          <Group gap="sm" align="center">
            <Button
              type="submit"
              loading={saving}
              className={`mv-save-primary${isDirty ? ' mv-save-primary--dirty' : ''}`}
            >
              Save
            </Button>
            {isDirty ? (
              <Button variant="default" onClick={onRevert} disabled={saving}>
                Revert
              </Button>
            ) : null}
            <Tooltip
              label="Copy metadata for the osu! discussion tab"
              multiline
              w={220}
            >
              <ActionIcon
                variant="light"
                size="lg"
                aria-label="Copy for discussion"
                onClick={() => void copyDiscussionMetadata()}
              >
                <IconCopy size={18} />
              </ActionIcon>
            </Tooltip>
            {discussionCopied ? (
              <Text size="sm" c="green">
                Copied!
              </Text>
            ) : null}
            {status && (
              <Text
                key={status}
                className="mv-status-line"
                size="sm"
                c={
                  status.startsWith('Updated')
                    ? 'green'
                    : status.startsWith('Failed')
                      ? 'red'
                      : 'dimmed'
                }
              >
                {status}
              </Text>
            )}
          </Group>
        </Stack>
      </Paper>
    </Stack>
  )
}
