import { normalizeMetadataText } from './source-match'
import type { ArtistTitleQuery } from './osu-beatmap-search-query'
import type { OsuBeatmapsetSearchHit } from './types'

const GENERIC_SEARCH_TOKENS = new Set([
  'long',
  'ver',
  'version',
  'edit',
  'short',
  'full',
  'size',
  'game',
  'cut',
  'sped',
  'album',
  'tv',
  'the',
  'and',
  'feat'
])

function tokenize(value: string): string[] {
  return normalizeMetadataText(value)
    .split(' ')
    .filter((token) => token.length > 0)
}

function significantTokens(tokens: string[]): string[] {
  return tokens.filter((token) => token.length > 2 && !GENERIC_SEARCH_TOKENS.has(token))
}

function isStrongContainedMatch(container: string, part: string): boolean {
  if (!part) return false
  if (container === part) return true
  if (!container.includes(part) && !part.includes(container)) return false

  const partTokens = tokenize(part)
  const containerTokens = tokenize(container)

  if (partTokens.length >= 2) return true
  if (containerTokens.length <= 1) return true

  return part.length >= container.length * 0.5
}

function scoreParsedArtistTitle(
  parsed: ArtistTitleQuery,
  artist: string,
  title: string
): number {
  const parsedArtist = normalizeMetadataText(parsed.artist)
  const parsedTitle = normalizeMetadataText(parsed.title)
  if (!parsedArtist || !parsedTitle) return 0

  const artistMatches =
    artist.includes(parsedArtist) ||
    parsedArtist.includes(artist) ||
    significantTokens(tokenize(parsed.artist)).every((token) => artist.includes(token))

  const titleTokens = significantTokens(tokenize(parsed.title))
  const titleMatches =
    title.includes(parsedTitle) ||
    parsedTitle.includes(title) ||
    (titleTokens.length > 0 && titleTokens.every((token) => title.includes(token)))

  if (artistMatches && titleMatches) return 9_800
  if (artistMatches) return 700
  return 0
}

/** Higher = better match to the user's search text. */
export function scoreBeatmapsetSearchRelevance(
  query: string,
  hit: OsuBeatmapsetSearchHit,
  parsed?: ArtistTitleQuery | null
): number {
  const normalizedQuery = normalizeMetadataText(query)
  if (!normalizedQuery && !parsed) return 0

  const title = normalizeMetadataText(`${hit.titleUnicode} ${hit.title}`)
  const artist = normalizeMetadataText(`${hit.artistUnicode} ${hit.artist}`)
  const combined = `${artist} ${title}`.trim()

  if (parsed) {
    const parsedScore = scoreParsedArtistTitle(parsed, artist, title)
    if (parsedScore >= 9_800) return parsedScore
  }

  if (normalizedQuery) {
    if (title === normalizedQuery) return 10_000
    if (combined === normalizedQuery) return 9_500
    if (isStrongContainedMatch(normalizedQuery, title)) return 9_000 + title.length
    if (isStrongContainedMatch(normalizedQuery, combined) || isStrongContainedMatch(combined, normalizedQuery)) {
      return 8_000 + combined.length
    }

    const queryTokens = tokenize(query)
    const significantQueryTokens = significantTokens(queryTokens)
    if (significantQueryTokens.length > 0) {
      const matchedSignificant = significantQueryTokens.filter((token) => combined.includes(token))
      const significantRatio = matchedSignificant.length / significantQueryTokens.length
      const matchedAny = queryTokens.filter((token) => combined.includes(token))
      const anyRatio = matchedAny.length / queryTokens.length
      const tokenScore = significantRatio * 1_000 + anyRatio * 100

      if (parsed) {
        return Math.max(tokenScore, scoreParsedArtistTitle(parsed, artist, title))
      }

      return tokenScore
    }
  }

  return parsed ? scoreParsedArtistTitle(parsed, artist, title) : 0
}

export function filterBeatmapsetSearchResults(
  hits: OsuBeatmapsetSearchHit[],
  query: string,
  parsed?: ArtistTitleQuery | null
): OsuBeatmapsetSearchHit[] {
  if (hits.length === 0) return hits

  const scored = hits
    .map((hit) => ({
      hit,
      score: scoreBeatmapsetSearchRelevance(query, hit, parsed)
    }))
    .sort((a, b) => b.score - a.score)

  const topScore = scored[0]?.score ?? 0
  if (topScore <= 0) return []

  const minScore = Math.max(450, topScore * 0.4)
  return scored.filter((entry) => entry.score >= minScore).map((entry) => entry.hit)
}
