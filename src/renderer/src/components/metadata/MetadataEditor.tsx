import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Group,
  Paper,
  Skeleton,
  Stack,
  Text,
  TextInput,
  Tooltip,
  useMantineTheme
} from '@mantine/core'
import { IconAlertTriangle, IconCopy, IconFolderOpen, IconWorld } from '@tabler/icons-react'
import { useMemo } from 'react'
import { getMetadataValidationIssues } from '@shared/metadata-validation'
import { getRomanizedFieldLocks, isAlreadyRomanized } from '@shared/romanization'
import type {
  BeatmapDifficultySummary,
  BeatmapMetadata,
  BeatmapSetSummary,
  TagSectionsExpanded
} from '@shared/types'
import { parseDisplayName } from '../../utils/parseDisplayName'
import DifficultyList from './DifficultyList'
import TagsField from './TagsField'

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
  source: string
  isFeaturedArtist: boolean
  isOnOsuWebsite: boolean
  mismatched: boolean
  isDirty: boolean
  loading: boolean
  saving: boolean
  status: string | null
  tagSectionsExpanded: TagSectionsExpanded
  onTagSectionsExpandedChange: (value: TagSectionsExpanded) => void
  onChange: (metadata: BeatmapMetadata) => void
  onSave: () => void
  onOpenFolder: () => void
  onOpenBeatmapPage: () => void
  onOpenImportModal: () => void
}

export default function MetadataEditor({
  selected,
  metadata,
  difficulties,
  difficultyVersions,
  creator,
  source,
  isFeaturedArtist,
  isOnOsuWebsite,
  mismatched,
  isDirty,
  loading,
  saving,
  status,
  tagSectionsExpanded,
  onTagSectionsExpandedChange,
  onChange,
  onSave,
  onOpenFolder,
  onOpenBeatmapPage,
  onOpenImportModal
}: MetadataEditorProps): JSX.Element {
  const theme = useMantineTheme()
  const { artist: lockArtistRomanized, title: lockTitleRomanized } = useMemo(
    () => getRomanizedFieldLocks(metadata),
    [metadata.artistUnicode, metadata.titleUnicode]
  )

  const { artist, title } = parseDisplayName(selected.displayName, selected.folderName)
  const hasBg = Boolean(selected.backgroundImageUrl)
  const validationIssues = useMemo(
    () => getMetadataValidationIssues(metadata, { mismatched }),
    [metadata, mismatched]
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

  if (loading) {
    return (
      <Stack gap="md" className="mv-content-enter">
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
    <Stack gap="md" className="mv-content-enter">
      <Paper
        p={0}
        radius="md"
        className="mv-paper-surface"
        style={{ overflow: 'hidden', position: 'relative', minHeight: 140 }}
      >
        <Box
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
        <Stack gap={4} p="md" style={{ position: 'relative', zIndex: 1 }}>
          <Group gap="sm" wrap="nowrap">
            <Text
              fw={700}
              size="xl"
              style={{ textShadow: '0 2px 12px rgba(0,0,0,0.5)', flex: 1, minWidth: 0 }}
            >
              {artist}
              {title ? ` - ${title}` : ''}
            </Text>
            {isOnOsuWebsite && (
              <Tooltip label="Open beatmap page on osu.ppy.sh">
                <span style={{ display: 'inline-flex', flexShrink: 0 }}>
                  <ActionIcon
                    variant="light"
                    color="gray"
                    size="sm"
                    aria-label="Open beatmap page"
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
          <Text size="sm" c="dimmed">
            {selected.folderName} · {selected.diffCount} difficult
            {selected.diffCount === 1 ? 'y' : 'ies'}
            {selected.lastModifiedAt > 0
              ? ` · Updated ${formatLastModified(selected.lastModifiedAt)}`
              : ''}
          </Text>
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
        </Group>

        <Stack gap="md" component="form" onSubmit={(e) => { e.preventDefault(); onSave() }}>
          {validationIssues.map((issue) => (
            <Alert
              key={issue.id}
              icon={<IconAlertTriangle />}
              color={issue.severity === 'error' ? 'red' : 'yellow'}
              variant="light"
            >
              {issue.message}
              {issue.id === 'mismatched'
                ? ' Saving will unify all .osu files in this set.'
                : ''}
            </Alert>
          ))}

          <Box>
            <Text size="xs" c="dimmed" mb={4}>
              Artist name
            </Text>
            <TextInput
              value={metadata.artistUnicode}
              onChange={(e) => update('artistUnicode', e.currentTarget.value)}
            />
          </Box>

          <Box>
            <Text size="xs" c="dimmed" mb={4}>
              Romanized artist name
            </Text>
            <TextInput
              value={metadata.artist}
              onChange={(e) => update('artist', e.currentTarget.value)}
              disabled={lockArtistRomanized}
            />
          </Box>

          <Box>
            <Text size="xs" c="dimmed" mb={4}>
              Song title
            </Text>
            <TextInput
              value={metadata.titleUnicode}
              onChange={(e) => update('titleUnicode', e.currentTarget.value)}
            />
          </Box>

          <Box>
            <Text size="xs" c="dimmed" mb={4}>
              Romanized song title
            </Text>
            <TextInput
              value={metadata.title}
              onChange={(e) => update('title', e.currentTarget.value)}
              disabled={lockTitleRomanized}
            />
          </Box>

          <TagsField
            folderPath={selected.folderPath}
            tags={metadata.tags}
            titleUnicode={metadata.titleUnicode}
            title={metadata.title}
            folderName={selected.folderName}
            source={source}
            difficultyVersions={difficultyVersions}
            creator={creator}
            isFeaturedArtist={isFeaturedArtist}
            tagSectionsExpanded={tagSectionsExpanded}
            onTagSectionsExpandedChange={onTagSectionsExpandedChange}
            onChange={(tags) => update('tags', tags)}
          />

          <Group gap="sm" align="center">
            <Button type="submit" loading={saving}>
              Save to all difficulties
            </Button>
            <Tooltip label="Import metadata from another mapset">
              <ActionIcon
                variant="light"
                size="lg"
                aria-label="Import metadata from another mapset"
                onClick={onOpenImportModal}
              >
                <IconCopy size={18} />
              </ActionIcon>
            </Tooltip>
            {status && (
              <Text
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
