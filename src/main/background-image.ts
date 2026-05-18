import { existsSync, readdirSync } from 'fs'
import { join } from 'path'
import { decodeOsuFile, readOsuFileBuffer } from './osu-file'

const EVENTS_SECTION = '[Events]'

function isBackgroundEvent(eventType: string): boolean {
  const normalized = eventType.toLowerCase()
  return normalized === '0' || normalized === 'background'
}

/** Background event: 0,startTime,filename,xOffset,yOffset */
function parseBackgroundFilenameFromEvents(content: string): string | null {
  const lines = content.split(/\r?\n/)
  const sectionStart = lines.findIndex((line) => line.trim() === EVENTS_SECTION)
  if (sectionStart === -1) return null

  for (let i = sectionStart + 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line || line.startsWith('//')) continue
    if (line.startsWith('[') && line.endsWith(']')) break

    const parts = line.split(',').map((p) => p.trim())
    if (!isBackgroundEvent(parts[0])) continue

    const filenameField = parts[2]
    if (!filenameField) continue

    return filenameField.replace(/^"(.*)"$/, '$1').trim()
  }

  return null
}

function resolveFileInFolder(folderPath: string, filename: string): string | null {
  const directPath = join(folderPath, filename)
  if (existsSync(directPath)) return directPath

  if (process.platform === 'win32') {
    try {
      const target = filename.toLowerCase()
      const match = readdirSync(folderPath).find((entry) => entry.toLowerCase() === target)
      if (match) {
        const resolved = join(folderPath, match)
        if (existsSync(resolved)) return resolved
      }
    } catch {
      return null
    }
  }

  return null
}

export function resolveBackgroundImagePath(
  folderPath: string,
  osuFilePath: string
): string | null {
  try {
    const buffer = readOsuFileBuffer(osuFilePath)
    const { text } = decodeOsuFile(buffer)
    const filename = parseBackgroundFilenameFromEvents(text)
    if (!filename) return null

    return resolveFileInFolder(folderPath, filename)
  } catch {
    return null
  }
}

export function resolveBackgroundFromSet(
  folderPath: string,
  osuFilePaths: string[]
): string | null {
  for (const osuFilePath of osuFilePaths) {
    const resolved = resolveBackgroundImagePath(folderPath, osuFilePath)
    if (resolved) return resolved
  }
  return null
}

export function toBeatmapBgUrl(absolutePath: string): string {
  return `beatmap-bg://image?path=${encodeURIComponent(absolutePath)}`
}
