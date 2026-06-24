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

const RANKED_STATUSES = new Set(['ranked', 'approved', 'qualified'])

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

/** Parenthesized osu! edition markers, e.g. (Game Ver.), (TV Size), (Nightcore & Sped Up Ver.). */
const TITLE_VERSION_MARKER_PATTERN =
  /\s*\([^)]*(?:\bVer\.?|\bMix\b|\bVersion\b|\bEdit\b|\bBootleg\b|\bGame\b|Sped\s*Up|Nightcore|Hardstyle|TV\s*Size|\bCut\b|\bShort\b|\bFull\b)[^)]*\)/gi

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

/** Title variants to query osu! with: full title and the same title without edition markers. */
export function uniqueMetadataSearchTitles(title: string): string[] {
  const trimmed = title.trim()
  if (!trimmed) return []

  const variants: string[] = []
  const seen = new Set<string>()

  const add = (value: string): void => {
    const normalized = normalizeMetadataText(value)
    if (!normalized || seen.has(normalized)) return
    seen.add(normalized)
    variants.push(value)
  }

  add(trimmed)
  add(stripTitleVersionMarkers(trimmed))
  return variants
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

function queryArtistValues(query: SourceMatchQuery): string[] {
  const seen = new Set<string>()
  const values: string[] = []

  for (const value of [query.artistUnicode, query.artist]) {
    const normalized = normalizeMetadataText(value.trim())
    if (!normalized || seen.has(normalized)) continue
    seen.add(normalized)
    values.push(normalized)
  }

  return values
}

function candidateArtistValues(
  candidate: Pick<SourceMatchCandidate, 'artist' | 'artistUnicode'>
): string[] {
  const seen = new Set<string>()
  const values: string[] = []

  for (const value of [candidate.artistUnicode, candidate.artist]) {
    if (!value?.trim()) continue
    const normalized = normalizeMetadataText(value)
    if (!normalized || seen.has(normalized)) continue
    seen.add(normalized)
    values.push(normalized)
  }

  return values
}

export function metadataMatchesCandidate(
  query: SourceMatchQuery,
  candidate: Pick<SourceMatchCandidate, 'artist' | 'artistUnicode' | 'title' | 'titleUnicode'>
): boolean {
  const queryArtists = queryArtistValues(query)
  const queryTitleRaw = pickTitle(query)
  if (queryArtists.length === 0 || !normalizeMetadataText(queryTitleRaw)) return false

  const artistValues = candidateArtistValues(candidate)
  const candidateTitleValues = [candidate.titleUnicode, candidate.title].filter(
    (value): value is string => Boolean(value?.trim())
  )

  const artistMatch = queryArtists.some((queryArtist) =>
    artistValues.some((candidateArtist) => candidateArtist === queryArtist)
  )
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

export function pickLatestRankedMetadataMatch(
  query: SourceMatchQuery,
  candidates: SourceMatchCandidate[]
): SourceMatchCandidate | null {
  const matches = candidates.filter(
    (candidate) => metadataMatchesCandidate(query, candidate) && isRankedStatus(candidate.status)
  )
  if (matches.length === 0) return null

  return [...matches].sort((a, b) => rankedDateMs(b) - rankedDateMs(a))[0] ?? null
}

export function dedupeSourceMatchCandidates(
  candidates: SourceMatchCandidate[]
): SourceMatchCandidate[] {
  const seen = new Map<number, SourceMatchCandidate>()
  for (const candidate of candidates) {
    const existing = seen.get(candidate.beatmapSetId)
    if (!existing || rankedDateMs(candidate) > rankedDateMs(existing)) {
      seen.set(candidate.beatmapSetId, candidate)
    }
  }
  return [...seen.values()]
}

export function buildSourceSuggestionCacheKey(query: SourceMatchQuery): string {
  return `${normalizeMetadataText(pickArtist(query))}::${normalizeMetadataText(pickTitle(query))}`
}
