import { readFileSync, writeFileSync } from 'fs'
import iconv from 'iconv-lite'
import type { BeatmapComboColour, BeatmapMetadata } from '../shared/types'
import { formatOsuComboLine, parseOsuRgbValue } from '../shared/combo-colours'

const METADATA_SECTION = '[Metadata]'
const EDITABLE_KEYS: (keyof BeatmapMetadata)[] = [
  'artist',
  'artistUnicode',
  'title',
  'titleUnicode',
  'source',
  'tags'
]

const KEY_MAP: Record<keyof BeatmapMetadata, string> = {
  artist: 'Artist',
  artistUnicode: 'ArtistUnicode',
  title: 'Title',
  titleUnicode: 'TitleUnicode',
  source: 'Source',
  tags: 'Tags'
}

const REVERSE_KEY_MAP = Object.fromEntries(
  Object.entries(KEY_MAP).map(([k, v]) => [v, k])
) as Record<string, keyof BeatmapMetadata>

export function readOsuFileBuffer(filePath: string): Buffer {
  return readFileSync(filePath)
}

export function decodeOsuFile(buffer: Buffer): { text: string; encoding: string } {
  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return { text: buffer.subarray(3).toString('utf8'), encoding: 'utf8' }
  }

  const asUtf8 = buffer.toString('utf8')
  if (!asUtf8.includes('\uFFFD')) {
    return { text: asUtf8, encoding: 'utf8' }
  }

  return { text: iconv.decode(buffer, 'shift_jis'), encoding: 'shift_jis' }
}

export function encodeOsuFile(text: string, encoding: string): Buffer {
  if (encoding === 'shift_jis') {
    return iconv.encode(text, 'shift_jis')
  }
  return Buffer.from(text, 'utf8')
}

function detectLineEnding(text: string): string {
  return text.includes('\r\n') ? '\r\n' : '\n'
}

function splitLines(text: string): string[] {
  return text.split(/\r?\n/)
}

function joinLines(lines: string[], eol: string): string {
  return lines.join(eol)
}

function parseMetadataSection(lines: string[], startIndex: number): Record<string, string> {
  const values: Record<string, string> = {}

  for (let i = startIndex + 1; i < lines.length; i++) {
    const line = lines[i]
    if (line.startsWith('[') && line.endsWith(']')) {
      break
    }
    const colonIndex = line.indexOf(':')
    if (colonIndex === -1) continue
    const key = line.slice(0, colonIndex).trim()
    const value = line.slice(colonIndex + 1).trimStart()
    values[key] = value
  }

  return values
}

function findMetadataSectionStart(lines: string[]): number {
  return lines.findIndex((line) => line.trim() === METADATA_SECTION)
}

export function readMetadataFromContent(text: string): BeatmapMetadata {
  const lines = splitLines(text)
  const sectionStart = findMetadataSectionStart(lines)
  if (sectionStart === -1) {
    return emptyMetadata()
  }

  const raw = parseMetadataSection(lines, sectionStart)
  return rawToMetadata(raw)
}

export function readMetadataFromFile(filePath: string): BeatmapMetadata {
  const buffer = readOsuFileBuffer(filePath)
  const { text } = decodeOsuFile(buffer)
  return readMetadataFromContent(text)
}

export function readMetadataFieldFromContent(text: string, field: string): string {
  const lines = splitLines(text)
  const sectionStart = findMetadataSectionStart(lines)
  if (sectionStart === -1) return ''

  const raw = parseMetadataSection(lines, sectionStart)
  return raw[field] ?? ''
}

export function readVersionFromContent(text: string): string {
  return readMetadataFieldFromContent(text, 'Version')
}

export function readBeatmapSetIdFromContent(text: string): number {
  const lines = splitLines(text)
  const sectionStart = findMetadataSectionStart(lines)
  if (sectionStart === -1) return 0

  const raw = parseMetadataSection(lines, sectionStart)
  for (const [key, value] of Object.entries(raw)) {
    if (key.toLowerCase() !== 'beatmapsetid') continue
    const parsed = Number.parseInt(value, 10)
    if (Number.isFinite(parsed) && parsed > 0) return parsed
  }
  return 0
}

export function readOsuFileText(filePath: string): string {
  const buffer = readOsuFileBuffer(filePath)
  return decodeOsuFile(buffer).text
}

export function readVersionFromFile(filePath: string): string {
  return readVersionFromContent(readOsuFileText(filePath))
}

export function readCreatorFromFile(filePath: string): string {
  return readMetadataFieldFromContent(readOsuFileText(filePath), 'Creator')
}

export function readSourceFromFile(filePath: string): string {
  return readMetadataFieldFromContent(readOsuFileText(filePath), 'Source')
}

export function readBeatmapSetIdFromFile(filePath: string): number {
  return readBeatmapSetIdFromContent(readOsuFileText(filePath))
}

function emptyMetadata(): BeatmapMetadata {
  return {
    artist: '',
    artistUnicode: '',
    title: '',
    titleUnicode: '',
    source: '',
    tags: ''
  }
}

function rawToMetadata(raw: Record<string, string>): BeatmapMetadata {
  const metadata = emptyMetadata()
  for (const [osuKey, value] of Object.entries(raw)) {
    const field = REVERSE_KEY_MAP[osuKey]
    if (field) {
      metadata[field] = value
    }
  }
  return metadata
}

export function metadataEquals(a: BeatmapMetadata, b: BeatmapMetadata): boolean {
  return EDITABLE_KEYS.every((key) => a[key] === b[key])
}

export function updateMetadataInFile(
  filePath: string,
  metadata: BeatmapMetadata
): void {
  const buffer = readOsuFileBuffer(filePath)
  const { text, encoding } = decodeOsuFile(buffer)
  const eol = detectLineEnding(text)
  const lines = splitLines(text)
  const sectionStart = findMetadataSectionStart(lines)

  if (sectionStart === -1) {
    throw new Error(`[Metadata] section not found in ${filePath}`)
  }

  let sectionEnd = lines.length
  for (let i = sectionStart + 1; i < lines.length; i++) {
    if (lines[i].startsWith('[') && lines[i].endsWith(']')) {
      sectionEnd = i
      break
    }
  }

  const newLines = [...lines]
  const updatedKeys = new Set<string>()

  for (let i = sectionStart + 1; i < sectionEnd; i++) {
    const line = lines[i]
    const colonIndex = line.indexOf(':')
    if (colonIndex === -1) continue

    const osuKey = line.slice(0, colonIndex).trim()
    const field = REVERSE_KEY_MAP[osuKey]
    if (field) {
      newLines[i] = `${osuKey}:${metadata[field]}`
      updatedKeys.add(osuKey)
    }
  }

  const missingLines = Object.values(KEY_MAP)
    .filter((osuKey) => !updatedKeys.has(osuKey))
    .map((osuKey) => {
      const field = REVERSE_KEY_MAP[osuKey]!
      return `${osuKey}:${metadata[field]}`
    })

  if (missingLines.length > 0) {
    newLines.splice(sectionEnd, 0, ...missingLines)
  }

  writeFileSync(filePath, encodeOsuFile(joinLines(newLines, eol), encoding))
}

const COLOURS_SECTION = '[Colours]'
const HIT_OBJECTS_SECTION = '[HitObjects]'

function findSectionStart(lines: string[], sectionHeader: string): number {
  return lines.findIndex((line) => line.trim() === sectionHeader)
}

export interface ParsedColoursSection {
  combos: BeatmapComboColour[]
  /** Non-`ComboN` lines inside `[Colours]` (e.g. `SliderBorder`), kept verbatim on save. */
  otherLines: string[]
  sectionStart: number
  sectionEnd: number
}

export function parseColoursSectionFromLines(lines: string[]): ParsedColoursSection {
  const sectionStart = findSectionStart(lines, COLOURS_SECTION)
  if (sectionStart === -1) {
    return { combos: [], otherLines: [], sectionStart: -1, sectionEnd: -1 }
  }

  let sectionEnd = lines.length
  for (let i = sectionStart + 1; i < lines.length; i++) {
    const t = lines[i].trim()
    if (t.startsWith('[') && t.endsWith(']')) {
      sectionEnd = i
      break
    }
  }

  const comboEntries: { index: number; colour: BeatmapComboColour }[] = []
  const otherLines: string[] = []

  for (let i = sectionStart + 1; i < sectionEnd; i++) {
    const line = lines[i]
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('//')) {
      continue
    }

    const comboMatch = trimmed.match(/^Combo(\d+)\s*:\s*(.+)$/)
    if (comboMatch) {
      const parsed = parseOsuRgbValue(comboMatch[2])
      if (parsed) {
        comboEntries.push({ index: Number(comboMatch[1]), colour: parsed })
      }
      continue
    }

    otherLines.push(line)
  }

  comboEntries.sort((a, b) => a.index - b.index)
  return {
    combos: comboEntries.map((e) => e.colour),
    otherLines,
    sectionStart,
    sectionEnd
  }
}

export function readComboColoursFromContent(text: string): BeatmapComboColour[] {
  const lines = splitLines(text)
  return parseColoursSectionFromLines(lines).combos
}

export function updateComboColoursInFile(
  filePath: string,
  combos: BeatmapComboColour[]
): void {
  const buffer = readOsuFileBuffer(filePath)
  const { text, encoding } = decodeOsuFile(buffer)
  const eol = detectLineEnding(text)
  const lines = splitLines(text)
  const parsed = parseColoursSectionFromLines(lines)

  const comboBodyLines = combos.map((c, i) => formatOsuComboLine(i + 1, c))
  const innerLines = [...comboBodyLines, ...parsed.otherLines]
  const hasContent = innerLines.length > 0

  if (!hasContent) {
    if (parsed.sectionStart === -1) {
      return
    }
    const newLines = [...lines.slice(0, parsed.sectionStart), ...lines.slice(parsed.sectionEnd)]
    writeFileSync(filePath, encodeOsuFile(joinLines(newLines, eol), encoding))
    return
  }

  const blockLines = [COLOURS_SECTION, ...innerLines]

  if (parsed.sectionStart === -1) {
    const hoIdx = findSectionStart(lines, HIT_OBJECTS_SECTION)
    let newLines: string[]
    if (hoIdx === -1) {
      newLines = [...lines, '', ...blockLines, '']
    } else {
      newLines = [...lines.slice(0, hoIdx), ...blockLines, '', ...lines.slice(hoIdx)]
    }
    writeFileSync(filePath, encodeOsuFile(joinLines(newLines, eol), encoding))
    return
  }

  const newLines = [
    ...lines.slice(0, parsed.sectionStart),
    ...blockLines,
    ...lines.slice(parsed.sectionEnd)
  ]
  writeFileSync(filePath, encodeOsuFile(joinLines(newLines, eol), encoding))
}
