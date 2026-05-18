import {
  Box,
  CloseButton,
  Group,
  Modal,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  UnstyledButton
} from '@mantine/core'
import {
  IconArrowLeft,
  IconChevronRight,
  IconMusic,
  IconTags,
  IconTypography
} from '@tabler/icons-react'
import { useMemo, useState } from 'react'
import { filterBeatmaps } from '@shared/filter-beatmaps'
import type { BeatmapMetadata, BeatmapSetSummary } from '@shared/types'
import BeatmapCard from '../beatmaps/BeatmapCard'
import { modalClassNames, modalOverlayProps, modalTransitionProps } from '../../theme/modal'
import { parseDisplayName } from '../../utils/parseDisplayName'

export type ImportMetadataMode = 'full' | 'tags' | 'song'

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
    description: 'Artist, romanized artist, title, romanized title, and tags — all fields replaced.',
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
    description: 'Replace artist and title fields only (unicode and romanized). Tags stay unchanged.',
    icon: IconMusic,
    color: 'grape'
  }
]

interface ImportMetadataModalProps {
  opened: boolean
  onClose: () => void
  beatmaps: BeatmapSetSummary[]
  currentFolderPath: string
  importing: boolean
  onImport: (sourceFolderPath: string, mode: ImportMetadataMode) => void
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
    titleUnicode: source.titleUnicode
  }
}

function ImportSourceHero({ beatmap }: { beatmap: BeatmapSetSummary }): JSX.Element {
  const { artist, title } = parseDisplayName(beatmap.displayName, beatmap.folderName)
  const bgUrl = beatmap.backgroundImageUrl

  return (
    <Paper radius="lg" p={0} className="mv-import-hero" style={{ overflow: 'hidden' }}>
      <Box
        className="mv-import-hero__bg"
        style={{
          height: 128,
          backgroundImage: bgUrl ? `url('${bgUrl}')` : undefined,
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
          {beatmap.diffCount} difficult{beatmap.diffCount === 1 ? 'y' : 'ies'}
        </Text>
      </Stack>
    </Paper>
  )
}

function ImportOptionsStep({
  picked,
  importing,
  onBack,
  onImport
}: {
  picked: BeatmapSetSummary
  importing: boolean
  onBack: () => void
  onImport: (mode: ImportMetadataMode) => void
}): JSX.Element {
  return (
    <Stack gap="xl" className="mv-step-enter">
      <UnstyledButton className="mv-text-button" onClick={onBack} disabled={importing}>
        <Group gap={6} wrap="nowrap">
          <IconArrowLeft size={16} />
          <Text size="sm" fw={500}>
            Choose another mapset
          </Text>
        </Group>
      </UnstyledButton>

      <ImportSourceHero beatmap={picked} />

      <Stack gap="xs">
        <Text fw={600} size="md">
          What do you want to import?
        </Text>
        <Text size="sm" c="dimmed" lh={1.55}>
          Each option <Text span fw={600} c="bright">replaces</Text> your current values — nothing is
          merged in.
        </Text>
      </Stack>

      <Stack gap="sm">
        {IMPORT_OPTIONS.map((option) => (
          <UnstyledButton
            key={option.mode}
            className="mv-import-option"
            disabled={importing}
            onClick={() => onImport(option.mode)}
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
  importing,
  onImport
}: ImportMetadataModalProps): JSX.Element {
  const [search, setSearch] = useState('')
  const [picked, setPicked] = useState<BeatmapSetSummary | null>(null)

  const candidates = useMemo(
    () => beatmaps.filter((bm) => bm.folderPath !== currentFolderPath),
    [beatmaps, currentFolderPath]
  )

  const filtered = useMemo(() => filterBeatmaps(candidates, search), [candidates, search])

  const handleClose = (): void => {
    setSearch('')
    setPicked(null)
    onClose()
  }

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={picked ? 'Import metadata' : 'Choose a mapset'}
      size={picked ? 'md' : 'lg'}
      centered
      overlayProps={modalOverlayProps}
      transitionProps={modalTransitionProps}
      classNames={{
        ...modalClassNames,
        body: picked ? 'mv-modal-body-options mv-modal-body' : 'mv-modal-body-picker mv-modal-body'
      }}
    >
      {picked ? (
        <ImportOptionsStep
          picked={picked}
          importing={importing}
          onBack={() => setPicked(null)}
          onImport={(mode) => onImport(picked.folderPath, mode)}
        />
      ) : (
        <Stack gap="md" className="mv-step-enter">
          <Text size="sm" c="dimmed" lh={1.5}>
            Pick a mapset from your library. You’ll choose exactly which fields to copy next.
          </Text>
          <TextInput
            placeholder="Search beatmaps..."
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
          {filtered.length === 0 ? (
            <Text size="sm" c="dimmed" ta="center" py="xl">
              {candidates.length === 0
                ? 'No other mapsets in your library.'
                : 'No mapsets match your search.'}
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
                  onSelectFolder={() => setPicked(bm)}
                />
              ))}
            </SimpleGrid>
          )}
        </Stack>
      )}
    </Modal>
  )
}
