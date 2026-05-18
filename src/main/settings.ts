import Store from 'electron-store'
import type { AppSettings } from '../shared/types'

const store = new Store<AppSettings>({
  name: 'osu-meta-settings',
  defaults: {
    songsPath: null
  }
})

export function getSettings(): AppSettings {
  return {
    songsPath: store.get('songsPath')
  }
}

export function setSongsPath(path: string): void {
  store.set('songsPath', path)
}

export function clearSongsPath(): void {
  store.set('songsPath', null)
}
