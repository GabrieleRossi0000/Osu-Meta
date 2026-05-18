import { useCallback, useEffect, useMemo, useState } from 'react'
import type { BeatmapMetadata, BeatmapSetSummary, DetectedPath } from '@shared/types'
import './App.css'

const emptyMetadata = (): BeatmapMetadata => ({
  artist: '',
  artistUnicode: '',
  title: '',
  titleUnicode: '',
  tags: ''
})

function SetupScreen({
  onReady
}: {
  onReady: (path: string) => void
}): JSX.Element {
  const [detected, setDetected] = useState<DetectedPath[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    window.api.detectSongsPaths().then(setDetected)
  }, [])

  const useDetected = async (): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      const path = await window.api.getDefaultSongsPath()
      if (!path) {
        setError('No osu! Songs folder was found. Choose a folder manually.')
        return
      }
      await window.api.setSongsPath(path)
      onReady(path)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set Songs folder.')
    } finally {
      setLoading(false)
    }
  }

  const pickFolder = async (): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      const path = await window.api.pickSongsFolder()
      if (path) onReady(path)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pick Songs folder.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="setup-screen">
      <h1>Welcome to Osu Meta</h1>
      <p>
        Select your osu! <strong>Songs</strong> folder. The app will list beatmap sets and
        update metadata across all difficulties at once.
      </p>

      <ul className="detected-list">
        {detected.map((item) => (
          <li key={item.path}>
            <span className={item.exists ? 'exists' : 'missing'}>
              {item.exists ? 'Found' : 'Not found'} — {item.label}
            </span>
            <div className="settings-path">{item.path}</div>
          </li>
        ))}
      </ul>

      {error && <p className="status-text error">{error}</p>}

      <div className="setup-actions">
        <button className="btn btn-primary" type="button" onClick={useDetected} disabled={loading}>
          Use detected folder
        </button>
        <button className="btn" type="button" onClick={pickFolder} disabled={loading}>
          Choose folder…
        </button>
      </div>
    </div>
  )
}

function ConfirmModal({
  message,
  onCancel,
  onConfirm
}: {
  message: string
  onCancel: () => void
  onConfirm: () => void
}): JSX.Element {
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h3>Unify mismatched metadata?</h3>
        <p>{message}</p>
        <div className="modal-actions">
          <button className="btn btn-ghost" type="button" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn btn-primary" type="button" onClick={onConfirm}>
            Save anyway
          </button>
        </div>
      </div>
    </div>
  )
}

function MetadataForm({
  selected,
  metadata,
  mismatched,
  onChange,
  onSave,
  saving,
  status
}: {
  selected: BeatmapSetSummary
  metadata: BeatmapMetadata
  mismatched: boolean
  onChange: (metadata: BeatmapMetadata) => void
  onSave: () => void
  saving: boolean
  status: string | null
}): JSX.Element {
  const update = (key: keyof BeatmapMetadata, value: string): void => {
    onChange({ ...metadata, [key]: value })
  }

  return (
    <div className="editor-panel">
      <div className="panel-header">
        <h2>{selected.displayName}</h2>
        <p>
          {selected.folderName} · {selected.diffCount} difficulty
          {selected.diffCount === 1 ? '' : 'ies'}
        </p>
      </div>

      {mismatched && (
        <p className="status-text" style={{ color: '#f0d9a8', marginBottom: '0.75rem' }}>
          Difficulties had mismatched metadata. Saving will unify all .osu files in this set.
        </p>
      )}

      <form
        className="metadata-form"
        onSubmit={(e) => {
          e.preventDefault()
          onSave()
        }}
      >
        <div className="field">
          <label htmlFor="artistUnicode">Artist name</label>
          <input
            id="artistUnicode"
            value={metadata.artistUnicode}
            onChange={(e) => update('artistUnicode', e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="artist">Romanized artist name</label>
          <input
            id="artist"
            value={metadata.artist}
            onChange={(e) => update('artist', e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="titleUnicode">Song title</label>
          <input
            id="titleUnicode"
            value={metadata.titleUnicode}
            onChange={(e) => update('titleUnicode', e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="title">Romanized song title</label>
          <input
            id="title"
            value={metadata.title}
            onChange={(e) => update('title', e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="tags">Tags</label>
          <textarea
            id="tags"
            value={metadata.tags}
            onChange={(e) => update('tags', e.target.value)}
          />
        </div>

        <div className="form-actions">
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save to all difficulties'}
          </button>
          {status && (
            <span
              className={`status-text ${status.startsWith('Updated') ? 'success' : status.startsWith('Failed') ? 'error' : ''}`}
            >
              {status}
            </span>
          )}
        </div>
      </form>
    </div>
  )
}

function MainScreen({
  songsPath,
  onChangeFolder
}: {
  songsPath: string
  onChangeFolder: () => void
}): JSX.Element {
  const [beatmaps, setBeatmaps] = useState<BeatmapSetSummary[]>([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<BeatmapSetSummary | null>(null)
  const [metadata, setMetadata] = useState<BeatmapMetadata>(emptyMetadata())
  const [mismatched, setMismatched] = useState(false)
  const [loadingList, setLoadingList] = useState(true)
  const [loadingMeta, setLoadingMeta] = useState(false)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)

  const loadBeatmaps = useCallback(async () => {
    setLoadingList(true)
    try {
      const sets = await window.api.scanBeatmaps()
      setBeatmaps(sets)
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Failed to scan beatmaps.')
    } finally {
      setLoadingList(false)
    }
  }, [])

  useEffect(() => {
    loadBeatmaps()
  }, [loadBeatmaps, songsPath])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return beatmaps
    return beatmaps.filter(
      (b) =>
        b.displayName.toLowerCase().includes(q) ||
        b.folderName.toLowerCase().includes(q)
    )
  }, [beatmaps, search])

  const selectBeatmap = async (set: BeatmapSetSummary): Promise<void> => {
    setSelected(set)
    setStatus(null)
    setLoadingMeta(true)
    try {
      const loaded = await window.api.loadMetadata(set.folderPath)
      setMetadata(loaded.metadata)
      setMismatched(loaded.mismatched)
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Failed to load metadata.')
    } finally {
      setLoadingMeta(false)
    }
  }

  const performSave = async (): Promise<void> => {
    if (!selected) return
    setSaving(true)
    setStatus(null)
    try {
      const result = await window.api.saveMetadata(selected.folderPath, metadata)
      setMismatched(false)
      setStatus(`Updated ${result.updatedFiles} .osu file(s).`)
      await loadBeatmaps()
    } catch (err) {
      setStatus(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setSaving(false)
      setShowConfirm(false)
    }
  }

  const handleSave = (): void => {
    if (!selected) return
    if (mismatched) {
      setShowConfirm(true)
      return
    }
    void performSave()
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Osu Meta</h1>
        <div className="app-header-actions">
          <span className="settings-path" title={songsPath}>
            {songsPath}
          </span>
          <button className="btn btn-ghost" type="button" onClick={onChangeFolder}>
            Change Songs folder
          </button>
          <button className="btn btn-ghost" type="button" onClick={loadBeatmaps} disabled={loadingList}>
            Rescan
          </button>
        </div>
      </header>

      <div className="banner">
        Close osu! before saving so your changes are not overwritten.
      </div>

      <div className="app-body">
        <div className="panel">
          <div className="panel-header">
            <h2>Beatmaps</h2>
            <p>{loadingList ? 'Scanning…' : `${filtered.length} sets`}</p>
            <input
              className="search-input"
              placeholder="Search artist, title, folder…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <ul className="map-list">
            {filtered.map((set) => (
              <li key={set.folderPath}>
                <button
                  type="button"
                  className={`map-item ${selected?.folderPath === set.folderPath ? 'active' : ''}`}
                  onClick={() => void selectBeatmap(set)}
                >
                  <span className="map-item-title">{set.displayName}</span>
                  <span className="map-item-sub">
                    {set.diffCount} diff{set.diffCount === 1 ? '' : 's'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {selected && !loadingMeta ? (
          <MetadataForm
            selected={selected}
            metadata={metadata}
            mismatched={mismatched}
            onChange={setMetadata}
            onSave={handleSave}
            saving={saving}
            status={status}
          />
        ) : (
          <div className="editor-panel editor-empty">
            {loadingMeta
              ? 'Loading metadata…'
              : 'Select a beatmap set to edit artist, title, and tags.'}
          </div>
        )}
      </div>

      {showConfirm && (
        <ConfirmModal
          message="Difficulties in this set have different metadata values. Saving will apply your edits to every .osu file."
          onCancel={() => setShowConfirm(false)}
          onConfirm={() => void performSave()}
        />
      )}
    </div>
  )
}

export default function App(): JSX.Element {
  const [songsPath, setSongsPath] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshSettings = useCallback(async () => {
    setLoading(true)
    const settings = await window.api.getSettings()
    setSongsPath(settings.songsPath)
    setLoading(false)
  }, [])

  useEffect(() => {
    void refreshSettings()
  }, [refreshSettings])

  const handleChangeFolder = async (): Promise<void> => {
    const path = await window.api.pickSongsFolder()
    if (path) setSongsPath(path)
  }

  if (loading) {
    return <div className="editor-panel editor-empty">Loading…</div>
  }

  if (!songsPath) {
    return <SetupScreen onReady={setSongsPath} />
  }

  return <MainScreen songsPath={songsPath} onChangeFolder={() => void handleChangeFolder()} />
}
