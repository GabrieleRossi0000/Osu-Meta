import type { BeatmapMetadata } from './types'

function discussionLine(label: string, value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  return `${label}: \`${trimmed}\``
}

/** osu! beatmap discussion tab BBCode metadata block. */
export function formatDiscussionMetadataExport(metadata: BeatmapMetadata): string {
  return [
    discussionLine('Artist', metadata.artistUnicode),
    discussionLine('RomanisedArtist', metadata.artist),
    discussionLine('Title', metadata.titleUnicode),
    discussionLine('RomanisedTitle', metadata.title),
    discussionLine('Source', metadata.source),
    discussionLine('Tags', metadata.tags)
  ]
    .filter((line): line is string => line !== null)
    .join('\n')
}
