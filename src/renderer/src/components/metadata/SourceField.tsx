import { Badge, Box, Group, Loader, Text, TextInput, Tooltip } from '@mantine/core'
import { useEffect, useMemo, useState } from 'react'
import { resolveBeatmapSetId } from '@shared/beatmap-set-id'
import { sourcesMatch } from '@shared/source-match'
import type { BeatmapMetadata, BeatmapSetSummary, RankedSourceSuggestionResult } from '@shared/types'

interface SourceFieldProps {
  selected: BeatmapSetSummary
  metadata: BeatmapMetadata
  onChange: (source: string) => void
}

export default function SourceField({
  selected,
  metadata,
  onChange
}: SourceFieldProps): JSX.Element {
  const [lookup, setLookup] = useState<RankedSourceSuggestionResult | null>(null)
  const [loading, setLoading] = useState(false)

  const currentSource = metadata.source.trim()
  const sourceIsEmpty = currentSource.length === 0

  const beatmapSetId = useMemo(
    () =>
      resolveBeatmapSetId({
        beatmapSetId: selected.beatmapSetId,
        folderName: selected.folderName
      }),
    [selected.beatmapSetId, selected.folderName]
  )

  useEffect(() => {
    setLookup(null)
  }, [selected.folderPath])

  useEffect(() => {
    const artist = metadata.artistUnicode.trim() || metadata.artist.trim()
    const title = metadata.titleUnicode.trim() || metadata.title.trim()
    if (!artist || !title) {
      setLookup(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    void window.api
      .suggestRankedSource({
        artistUnicode: metadata.artistUnicode,
        artist: metadata.artist,
        titleUnicode: metadata.titleUnicode,
        title: metadata.title,
        beatmapSetId,
        refresh: sourceIsEmpty
      })
      .then((result) => {
        if (!cancelled) setLookup(result)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [
    metadata.artist,
    metadata.artistUnicode,
    metadata.title,
    metadata.titleUnicode,
    selected.folderPath,
    beatmapSetId,
    sourceIsEmpty
  ])

  const suggestion = lookup?.kind === 'found' ? lookup.suggestion : null
  const showSuggestion =
    suggestion != null &&
    suggestion.source.trim().length > 0 &&
    (sourceIsEmpty || !sourcesMatch(currentSource, suggestion.source))

  return (
    <Box className="mv-field-wrap">
      <Group justify="space-between" mb={4} gap="xs">
        <Text size="xs" c="dimmed">
          Source
        </Text>
        {loading ? <Loader size={14} /> : null}
      </Group>

      {showSuggestion && (
        <Group gap={6} mb="xs">
          <Text size="xs" c="dimmed">
            From ranked map on osu!:
          </Text>
          <Tooltip
            label={`${suggestion.artist} - ${suggestion.title} · mapped by ${suggestion.creator} · set #${suggestion.beatmapSetId}`}
          >
            <Badge
              variant="light"
              color="indigo"
              style={{ cursor: 'pointer', maxWidth: '100%' }}
              onClick={() => onChange(suggestion.source)}
            >
              + {suggestion.source}
            </Badge>
          </Tooltip>
          <Text
            size="xs"
            c="dimmed"
            style={{ cursor: 'pointer', textDecoration: 'underline' }}
            onClick={() => void window.api.openBeatmapPage(suggestion.beatmapSetId)}
          >
            View set
          </Text>
        </Group>
      )}

      <TextInput
        value={metadata.source}
        onChange={(e) => onChange(e.currentTarget.value)}
        placeholder="Anime, game, or other source"
      />
    </Box>
  )
}
