import {
  ActionIcon,
  Alert,
  CloseButton,
  Flex,
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
import { useVirtualizer } from '@tanstack/react-virtual'
import { memo, useCallback, useEffect, useMemo, useRef, type RefObject } from 'react'
import { resolveBeatmapSetId } from '@shared/beatmap-set-id'
import type { BeatmapSetStatusEntry, BeatmapSetSummary } from '@shared/types'
import BeatmapCard from './BeatmapCard'

const CARD_HEIGHT = 96
const CARD_GAP = 8

interface BeatmapsSidebarProps {
  /** Filtered list to render (search applied in parent) */
  filteredBeatmaps: BeatmapSetSummary[]
  totalBeatmapCount: number
  loading: boolean
  songsConfigured: boolean
  selectedFolderPath: string | null
  highlightedFolderPath: string | null
  dirtyFolderPath: string | null
  search: string
  onSearchChange: (value: string) => void
  searchInputRef?: RefObject<HTMLInputElement>
  onSelect: (set: BeatmapSetSummary) => void
  onRefresh: (force?: boolean) => void
  onFetchCurrent: () => void
  fetchingCurrent: boolean
  fetchNotice: string | null
  onDismissFetchNotice: () => void
  statusBySetId: Record<number, BeatmapSetStatusEntry>
}

function BeatmapsSidebar({
  filteredBeatmaps,
  totalBeatmapCount,
  loading,
  songsConfigured,
  selectedFolderPath,
  highlightedFolderPath,
  dirtyFolderPath,
  search,
  onSearchChange,
  searchInputRef,
  onSelect,
  onRefresh,
  onFetchCurrent,
  fetchingCurrent,
  fetchNotice,
  onDismissFetchNotice,
  statusBySetId
}: BeatmapsSidebarProps): JSX.Element {
  const scrollRef = useRef<HTMLDivElement>(null)

  const beatmapByFolder = useMemo(() => {
    const map = new Map<string, BeatmapSetSummary>()
    for (const bm of filteredBeatmaps) {
      map.set(bm.folderPath, bm)
    }
    return map
  }, [filteredBeatmaps])

  const onSelectFolder = useCallback(
    (folderPath: string) => {
      const bm = beatmapByFolder.get(folderPath)
      if (bm) onSelect(bm)
    },
    [beatmapByFolder, onSelect]
  )

  const virtualizer = useVirtualizer({
    count: filteredBeatmaps.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => CARD_HEIGHT,
    gap: CARD_GAP,
    paddingStart: CARD_GAP,
    paddingEnd: CARD_GAP,
    overscan: 8
  })

  const scrollTargetPath = highlightedFolderPath ?? selectedFolderPath

  useEffect(() => {
    if (!scrollTargetPath || filteredBeatmaps.length === 0) return
    const index = filteredBeatmaps.findIndex((bm) => bm.folderPath === scrollTargetPath)
    if (index < 0) return
    virtualizer.scrollToIndex(index, {
      align: 'center',
      behavior: highlightedFolderPath ? 'smooth' : 'auto'
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- scroll when selection/highlight changes
  }, [scrollTargetPath, filteredBeatmaps, highlightedFolderPath])

  const emptyLibrary = !loading && songsConfigured && totalBeatmapCount === 0
  const noResults =
    !loading && totalBeatmapCount > 0 && filteredBeatmaps.length === 0 && search.trim().length > 0

  return (
    <Flex
      direction="column"
      w="100%"
      h="100%"
      style={{ overflow: 'hidden', position: 'relative' }}
    >
      <Flex direction="column" gap="sm" px="xs" pt="xs" pb={0} className="mv-sidebar-toolbar">
        <Flex gap="sm" direction="row" justify="space-between" wrap="nowrap">
          <TextInput
            className="mv-search-input"
            ref={searchInputRef}
            placeholder="Search name or set ID..."
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
          <Tooltip
            label="Fetch the map selected in osu! (Ctrl+Shift+F)"
            multiline
            w={220}
          >
            <ActionIcon
              variant="default"
              onClick={onFetchCurrent}
              size="sm"
              loading={fetchingCurrent}
              aria-label="Fetch current map from osu!"
            >
              <IconDownload size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Rescan Songs folder (Shift+click for full rescan)" multiline w={220}>
            <ActionIcon
              variant="default"
              onClick={(event) => onRefresh(event.shiftKey)}
              size="sm"
              loading={loading}
              aria-label="Rescan Songs folder"
            >
              <IconRefresh size={16} />
            </ActionIcon>
          </Tooltip>
        </Flex>

        {fetchNotice && (
          <Alert
            color="yellow"
            variant="light"
            title="Current map"
            className="mv-alert-slide-down"
            withCloseButton
            onClose={onDismissFetchNotice}
          >
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

        {loading && totalBeatmapCount === 0 && (
          <Alert icon={<IconAlertCircle />} color="blue" title="Scanning" variant="light">
            Loading beatmaps from your Songs folder…
          </Alert>
        )}
      </Flex>
      <div
        ref={scrollRef}
        className="mv-sidebar-scroll"
        style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto' }}
      >
        {loading && totalBeatmapCount === 0 ? (
          <Flex direction="column" gap={CARD_GAP} px="xs" pt={CARD_GAP} pb={CARD_GAP} className="mv-skeleton-shimmer">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} height={CARD_HEIGHT} radius="md" />
            ))}
          </Flex>
        ) : (
          <div
            style={{
              height: virtualizer.getTotalSize(),
              width: '100%',
              position: 'relative'
            }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const bm = filteredBeatmaps[virtualRow.index]
              const setId = resolveBeatmapSetId(bm)
              return (
                <div
                  key={bm.folderPath}
                  data-index={virtualRow.index}
                  ref={virtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    paddingInline: 'var(--mantine-spacing-xs)',
                    transform: `translateY(${virtualRow.start}px)`
                  }}
                >
                  <BeatmapCard
                    beatmap={bm}
                    statusEntry={setId != null ? (statusBySetId[setId] ?? null) : null}
                    isSelected={selectedFolderPath === bm.folderPath}
                    isHighlighted={highlightedFolderPath === bm.folderPath}
                    isDirty={dirtyFolderPath === bm.folderPath}
                    onSelectFolder={onSelectFolder}
                  />
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Flex>
  )
}

export default memo(BeatmapsSidebar)
