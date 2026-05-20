export interface ArtistTitleQuery {
  artist: string
  title: string
}

export function buildStructuredBeatmapSearchQuery(artist: string, title: string): string {
  return `artist=${artist} title=${title}`
}

export function parseStructuredBeatmapSearchQuery(query: string): ArtistTitleQuery | null {
  const trimmed = query.trim()
  const artist = trimmed.match(/(?:^|\s)artist=(.+?)(?=\s+title=|\s+status=|$)/i)?.[1]?.trim()
  const title = trimmed.match(/(?:^|\s)title=(.+?)(?=\s+status=|\s+artist=|$)/i)?.[1]?.trim()
  if (!artist || !title) return null
  return { artist, title }
}

/** Guess artist/title from free-text queries like "UNDEAD CORPORATION No Filter". */
export function parseArtistTitleQuery(query: string): ArtistTitleQuery | null {
  const trimmed = query.trim()
  if (!trimmed || /[=]/.test(trimmed)) return null

  const dashMatch = trimmed.match(/^(.+?)\s+-\s+(.+)$/)
  if (dashMatch) {
    const artist = dashMatch[1].trim()
    const title = dashMatch[2].trim()
    if (artist && title) return { artist, title }
  }

  const tokens = trimmed.split(/\s+/).filter(Boolean)
  if (tokens.length < 3) return null

  for (const titleWordCount of [2, 3, 1]) {
    if (tokens.length > titleWordCount) {
      return {
        artist: tokens.slice(0, -titleWordCount).join(' '),
        title: tokens.slice(-titleWordCount).join(' ')
      }
    }
  }

  return null
}

export function resolveArtistTitleQuery(query: string): ArtistTitleQuery | null {
  return parseStructuredBeatmapSearchQuery(query) ?? parseArtistTitleQuery(query)
}

export function searchQueriesFor(query: string): string[] {
  const trimmed = query.trim()
  if (!trimmed) return []

  const queries = new Set<string>([trimmed])
  const parsed = resolveArtistTitleQuery(trimmed)
  if (parsed) {
    queries.add(buildStructuredBeatmapSearchQuery(parsed.artist, parsed.title))
  }

  return [...queries]
}
