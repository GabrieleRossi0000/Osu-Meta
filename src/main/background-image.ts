import { existsSync } from 'fs'
import { join } from 'path'
import { decodeOsuFile, readOsuFileBuffer } from './osu-file'

const EVENTS_SECTION = '[Events]'

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
    if (parts[0] !== '0') continue

    const filenameField = parts[2]
    if (!filenameField) continue

    return filenameField.replace(/^"(.*)"$/, '$1').trim()
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

    const imagePath = join(folderPath, filename)
    if (!existsSync(imagePath)) return null

    return imagePath
  } catch {
    return null
  }
}

export function toBeatmapBgUrl(absolutePath: string): string {
  const encoded = Buffer.from(absolutePath, 'utf8').toString('base64url')
  return `beatmap-bg://${encoded}`
}
