const USER_AGENT = 'OsuMeta/1.0'

/** Genre/Language as shown on the beatmap page (set-level on osu! API / website). */
export interface OsuGenreLanguage {
  id?: number
  name?: string
}

export interface OsuWebBeatmapset {
  id: number
  artist: string
  artist_unicode: string
  title: string
  title_unicode: string
  source: string
  status: string
  creator: string
  play_count: number
  ranked_date?: string
  tags?: string
  genre?: OsuGenreLanguage
  language?: OsuGenreLanguage
  covers?: {
    cover?: string
  }
}

function parseGenreLanguageField(value: unknown): OsuGenreLanguage | undefined {
  if (!value || typeof value !== 'object') return undefined
  const record = value as { id?: unknown; name?: unknown }
  const id = typeof record.id === 'number' ? record.id : undefined
  const name = typeof record.name === 'string' ? record.name : undefined
  if (id == null && !name) return undefined
  return { id, name }
}

function parseJsonScript(html: string, scriptId: string): unknown | null {
  const marker = `<script id="${scriptId}" type="application/json">`
  const start = html.indexOf(marker)
  if (start === -1) return null

  const jsonStart = start + marker.length
  const jsonEnd = html.indexOf('</script>', jsonStart)
  if (jsonEnd === -1) return null

  try {
    return JSON.parse(html.slice(jsonStart, jsonEnd).trim())
  } catch {
    return null
  }
}

export async function fetchFirstBeatmapIdFromWebPage(beatmapSetId: number): Promise<number | null> {
  if (beatmapSetId <= 0) return null

  try {
    const response = await fetch(`https://osu.ppy.sh/beatmapsets/${beatmapSetId}`, {
      headers: { 'User-Agent': USER_AGENT }
    })
    if (!response.ok) return null

    const html = await response.text()
    const parsed = parseJsonScript(html, 'json-beatmapset')
    if (!parsed || typeof parsed !== 'object') return null

    const beatmaps = (parsed as { beatmaps?: { id?: number }[] }).beatmaps
    const id = beatmaps?.find((bm) => typeof bm.id === 'number')?.id
    return typeof id === 'number' && id > 0 ? id : null
  } catch {
    return null
  }
}

export async function fetchBeatmapsetFromWebPage(
  beatmapSetId: number
): Promise<OsuWebBeatmapset | null> {
  if (beatmapSetId <= 0) return null

  try {
    const response = await fetch(`https://osu.ppy.sh/beatmapsets/${beatmapSetId}`, {
      headers: { 'User-Agent': USER_AGENT }
    })
    if (!response.ok) return null

    const html = await response.text()
    const parsed = parseJsonScript(html, 'json-beatmapset')
    if (!parsed || typeof parsed !== 'object') return null

    const set = parsed as Partial<OsuWebBeatmapset>
    if (typeof set.id !== 'number' || typeof set.artist !== 'string' || typeof set.title !== 'string') {
      return null
    }

    return {
      id: set.id,
      artist: set.artist,
      artist_unicode: set.artist_unicode ?? set.artist,
      title: set.title,
      title_unicode: set.title_unicode ?? set.title,
      source: set.source ?? '',
      status: set.status ?? '',
      creator: set.creator ?? '',
      play_count: set.play_count ?? 0,
      ranked_date: typeof set.ranked_date === 'string' ? set.ranked_date : undefined,
      tags: typeof set.tags === 'string' ? set.tags : '',
      genre: parseGenreLanguageField(set.genre),
      language: parseGenreLanguageField(set.language),
      covers: set.covers
    }
  } catch {
    return null
  }
}

export function toSourceMatchCandidate(set: OsuWebBeatmapset) {
  return {
    artist: set.artist,
    artistUnicode: set.artist_unicode,
    title: set.title,
    titleUnicode: set.title_unicode,
    source: set.source,
    status: set.status,
    beatmapSetId: set.id,
    creator: set.creator,
    playCount: set.play_count,
    rankedDate: set.ranked_date
  }
}

export function webBeatmapsetGenreLanguage(set: OsuWebBeatmapset): {
  genre: string
  language: string
} {
  return {
    genre: set.genre?.name?.trim() ?? '',
    language: set.language?.name?.trim() ?? ''
  }
}

export function webBeatmapsetToMetadata(set: OsuWebBeatmapset) {
  return {
    artist: set.artist,
    artistUnicode: set.artist_unicode,
    title: set.title,
    titleUnicode: set.title_unicode,
    source: set.source ?? '',
    tags: set.tags ?? ''
  }
}
