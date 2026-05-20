export interface SourceMatchQuery {
  artistUnicode: string
  artist: string
  titleUnicode: string
  title: string
}

export interface SourceMatchCandidate {
  artist: string
  artistUnicode?: string
  title: string
  titleUnicode?: string
  source: string
  status: string
  beatmapSetId: number
  creator: string
  playCount?: number
  rankedDate?: string
}

const RANKED_STATUSES = new Set(['ranked', 'approved'])

export function normalizeMetadataText(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function pickArtist(query: SourceMatchQuery): string {
  return query.artistUnicode.trim() || query.artist.trim()
}

function pickTitle(query: SourceMatchQuery): string {
  return query.titleUnicode.trim() || query.title.trim()
}

/** Parenthesized osu! edition markers, e.g. (Game Ver.), (Nightcore Mix). */
const TITLE_VERSION_MARKER_PATTERN =
  /\s*\([^)]*(?:\bVer\.?|\bMix\b|\bVersion\b|\bEdit\b|\bBootleg\b|Sped\s*Up|Nightcore|Hardstyle|TV\s*Size|\bCut\b|\bShort\b|\bFull\b)[^)]*\)/gi

export function stripTitleVersionMarkers(title: string): string {
  if (!title.trim()) return title

  return title
    .replace(TITLE_VERSION_MARKER_PATTERN, '')
    .replace(/\s*\/\s*/g, '/')
    .replace(/\s+/g, ' ')
    .trim()
}

export function titleHasVersionMarkers(title: string): boolean {
  const stripped = stripTitleVersionMarkers(title)
  return stripped.length > 0 && normalizeMetadataText(stripped) !== normalizeMetadataText(title)
}

function titleValuesMatch(queryTitle: string, candidateTitleValues: string[]): boolean {
  const queryNorm = normalizeMetadataText(queryTitle)
  const queryStrippedNorm = normalizeMetadataText(stripTitleVersionMarkers(queryTitle))
  if (!queryNorm && !queryStrippedNorm) return false

  return candidateTitleValues.some((candidateTitle) => {
    const candidateNorm = normalizeMetadataText(candidateTitle)
    const candidateStrippedNorm = normalizeMetadataText(stripTitleVersionMarkers(candidateTitle))
    if (!candidateNorm && !candidateStrippedNorm) return false

    return (
      queryNorm === candidateNorm ||
      queryNorm === candidateStrippedNorm ||
      queryStrippedNorm === candidateNorm ||
      queryStrippedNorm === candidateStrippedNorm
    )
  })
}

export function metadataMatchesCandidate(
  query: SourceMatchQuery,
  candidate: Pick<SourceMatchCandidate, 'artist' | 'artistUnicode' | 'title' | 'titleUnicode'>
): boolean {
  const queryArtist = normalizeMetadataText(pickArtist(query))
  const queryTitleRaw = pickTitle(query)
  if (!queryArtist || !normalizeMetadataText(queryTitleRaw)) return false

  const artistValues = [candidate.artistUnicode, candidate.artist]
    .filter(Boolean)
    .map((value) => normalizeMetadataText(value!))
  const candidateTitleValues = [candidate.titleUnicode, candidate.title].filter(
    (value): value is string => Boolean(value?.trim())
  )

  const artistMatch = artistValues.some((value) => value === queryArtist)
  const titleMatch = titleValuesMatch(queryTitleRaw, candidateTitleValues)
  return artistMatch && titleMatch
}

export function isRankedStatus(status: string): boolean {
  return RANKED_STATUSES.has(status.toLowerCase())
}

export function sourcesMatch(a: string, b: string): boolean {
  const left = normalizeMetadataText(a)
  const right = normalizeMetadataText(b)
  return left.length > 0 && left === right
}

function rankedDateMs(candidate: SourceMatchCandidate): number {
  if (!candidate.rankedDate) return 0
  const ms = Date.parse(candidate.rankedDate)
  return Number.isFinite(ms) ? ms : 0
}

export function pickBestRankedSource(
  query: SourceMatchQuery,
  candidates: SourceMatchCandidate[]
): SourceMatchCandidate | null {
  const rankedWithSource = candidates.filter(
    (candidate) =>
      isRankedStatus(candidate.status) &&
      candidate.source.trim().length > 0 &&
      metadataMatchesCandidate(query, candidate)
  )

  if (rankedWithSource.length === 0) return null

  rankedWithSource.sort((a, b) => rankedDateMs(b) - rankedDateMs(a))
  return rankedWithSource[0] ?? null
}

export function buildSourceSuggestionCacheKey(query: SourceMatchQuery): string {
  return `${normalizeMetadataText(pickArtist(query))}::${normalizeMetadataText(pickTitle(query))}`
}
