import {
  ActionIcon,
  Alert,
  CloseButton,
  Divider,
  Flex,
  ScrollArea,
  Skeleton,
  TextInput,
  Tooltip
} from '@mantine/core'
import {
  IconAlertCircle,
  IconDownload,
  IconFolderOff,
  IconRefresh,
  IconSearchOff
} from '@tabler/icons-react'
import { useMemo, useRef, type RefObject } from 'react'
import type { BeatmapSetSummary } from '@shared/types'
import { filterBeatmaps } from '@shared/filter-beatmaps'
import BeatmapCard from './BeatmapCard'

interface BeatmapsSidebarProps {
  beatmaps: BeatmapSetSummary[]
  loading: boolean
  songsConfigured: boolean
  selectedFolderPath: string | null
  highlightedFolderPath: string | null
  search: string
  onSearchChange: (value: string) => void
  searchInputRef?: RefObject<HTMLInputElement>
  onSelect: (set: BeatmapSetSummary) => void
  onRefresh: (force?: boolean) => void
  onFetchCurrent: () => void
  fetchingCurrent: boolean
  fetchNotice: string | null
}

export default function BeatmapsSidebar({
  beatmaps,
  loading,
  songsConfigured,
  selectedFolderPath,
  highlightedFolderPath,
  search,
  onSearchChange,
  searchInputRef,
  onSelect,
  onRefresh,
  onFetchCurrent,
  fetchingCurrent,
  fetchNotice
}: BeatmapsSidebarProps): JSX.Element {
  const scrollRef = useRef<HTMLDivElement>(null)

  const filtered = useMemo(() => filterBeatmaps(beatmaps, search), [beatmaps, search])

  const emptyLibrary = !loading && songsConfigured && beatmaps.length === 0
  const noResults = !loading && beatmaps.length > 0 && filtered.length === 0 && search.trim().length > 0

  return (
    <Flex
      direction="column"
      w="100%"
      h="100%"
      style={{ overflow: 'hidden', position: 'relative' }}
    >
      <Flex direction="column" gap="sm" p="xs">
        <Flex gap="sm" direction="row" justify="space-between" wrap="nowrap">
          <TextInput
            ref={searchInputRef}
            placeholder="Search beatmaps..."
            value={search}
            onChange={(e) => onSearchChange(e.currentTarget.value)}
            rightSectionPointerEvents="all"
            rightSection={
              <CloseButton
                aria-label="Clear input"
                onClick={() => onSearchChange('')}
                style={{ display: search ? undefined : 'none' }}
              />
            }
            style={{ flex: 1 }}
          />
          <Tooltip label="Fetch the map selected in osu! (song select or editor)">
            <ActionIcon
              variant="default"
              onClick={onFetchCurrent}
              size={36}
              loading={fetchingCurrent}
              aria-label="Fetch current map from osu!"
            >
              <IconDownload />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Rescan Songs folder (Shift+click for full rescan)">
            <ActionIcon
              variant="default"
              onClick={(event) => onRefresh(event.shiftKey)}
              size={36}
              loading={loading}
              aria-label="Rescan Songs folder"
            >
              <IconRefresh />
            </ActionIcon>
          </Tooltip>
        </Flex>

        {fetchNotice && (
          <Alert color="yellow" variant="light" title="Current map">
            {fetchNotice}
          </Alert>
        )}

        {emptyLibrary && (
          <Alert icon={<IconFolderOff />} color="gray" title="Songs folder empty" variant="light">
            No beatmap folders with .osu files were found. Check your Songs path in settings.
          </Alert>
        )}

        {noResults && (
          <Alert icon={<IconSearchOff />} color="gray" title="No results" variant="light">
            No mapsets match your search. Try a different query.
          </Alert>
        )}

        {loading && beatmaps.length === 0 && (
          <Alert icon={<IconAlertCircle />} color="blue" title="Scanning" variant="light">
            Loading beatmaps from your Songs folder…
          </Alert>
        )}
      </Flex>
      <Divider />
      <ScrollArea
        type="auto"
        offsetScrollbars="present"
        viewportRef={scrollRef}
        p="xs"
        style={{ flex: '1 1 auto', minHeight: 0 }}
      >
        <Flex direction="column" gap="xs" w="100%" style={{ justifyContent: 'center' }}>
          {loading && beatmaps.length === 0
            ? Array.from({ length: 6 }, (_, index) => (
                <Skeleton key={index} height={96} radius="md" />
              ))
            : filtered.map((bm) => (
                <BeatmapCard
                  key={bm.folderPath}
                  beatmap={bm}
                  isSelected={selectedFolderPath === bm.folderPath}
                  isHighlighted={highlightedFolderPath === bm.folderPath}
                  onSelect={() => onSelect(bm)}
                />
              ))}
        </Flex>
      </ScrollArea>
    </Flex>
  )
}
