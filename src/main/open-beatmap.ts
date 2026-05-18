import { shell } from 'electron'
import { existsSync } from 'fs'

export function openBeatmapFolder(folderPath: string): void {
  if (!existsSync(folderPath)) {
    throw new Error('Beatmap folder does not exist.')
  }
  void shell.openPath(folderPath)
}
