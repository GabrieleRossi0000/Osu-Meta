import { Badge, Group, Text, Tooltip } from '@mantine/core'
import type { RomanizationFieldSuggestion } from '@shared/metadata-romanization-suggestions'

interface RomanizationFieldSuggestionRowProps {
  suggestion: RomanizationFieldSuggestion
  onApply: (field: RomanizationFieldSuggestion['field'], value: string) => void
  /** True when the suggestion comes from the map's own beatmapset on osu!. */
  fromOwnSet?: boolean
}

function displayLabel(field: RomanizationFieldSuggestion['field']): string {
  switch (field) {
    case 'artistUnicode':
      return 'Artist name'
    case 'artist':
      return 'Romanized artist name'
    case 'titleUnicode':
      return 'Song title'
    case 'title':
      return 'Romanized song title'
  }
}

export default function RomanizationFieldSuggestionRow({
  suggestion,
  onApply,
  fromOwnSet = false
}: RomanizationFieldSuggestionRowProps): JSX.Element | null {
  const { field, value, beatmapSetId } = suggestion
  if (!value.trim()) return null

  const sourceLabel = fromOwnSet ? 'From your map on osu!:' : 'From ranked map on osu!:'
  const actionPrefix = suggestion.kind === 'casing' ? '→' : '+'

  return (
    <Group gap={6} mb={4}>
      <Text size="xs" c="dimmed">
        {sourceLabel}
      </Text>
      <Tooltip
        label={
          suggestion.kind === 'casing'
            ? `Use osu! spelling for ${displayLabel(field).toLowerCase()} · set #${beatmapSetId}`
            : `Suggested ${displayLabel(field).toLowerCase()} · set #${beatmapSetId}`
        }
      >
        <Badge
          variant="light"
          color="indigo"
          style={{ cursor: 'pointer', maxWidth: '100%' }}
          onClick={() => onApply(field, value)}
        >
          {actionPrefix} {value}
        </Badge>
      </Tooltip>
      <Text
        size="xs"
        c="dimmed"
        style={{ cursor: 'pointer', textDecoration: 'underline' }}
        onClick={() => void window.api.openBeatmapPage(beatmapSetId)}
      >
        View set
      </Text>
    </Group>
  )
}
