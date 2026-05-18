import { useCallback, useEffect, useMemo, useState } from 'react'
import { applyRomanizedFieldLocks, getRomanizedFieldLocks, isAlreadyRomanized } from '@shared/romanization'
import type { BeatmapMetadata, BeatmapSetSummary, DetectedPath } from '@shared/types'
import './App.css'

function formatLastModified(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  })
}

const emptyMetadata = (): BeatmapMetadata => ({
  artist: '',
  artistUnicode: '',
  title: '',
  titleUnicode: '',
  tags: ''
})

function MapListItem({
  set,
  active,
  onSelect
}: {
  set: BeatmapSetSummary
  active: boolean
  onSelect: () => void
}): JSX.Element {
  const hasBg = Boolean(set.backgroundImageUrl)

  return (
    <li>
      <button
        type="button"
        className={`map-item ${active ? 'active' : ''} ${hasBg ? '' : 'map-item--no-bg'}`}
        onClick={onSelect}
      >
        {hasBg && (
          <img
            className="map-item-bg"
            src={set.backgroundImageUrl!}
            alt=""
            loading="lazy"
            draggable={false}
          />
        )}
        <span className="map-item-overlay" aria-hidden />
        <span className="map-item-content">
          <span className="map-item-title">{set.displayName}</span>
          <span className="map-item-sub">
            {set.diffCount} diff{set.diffCount === 1 ? '' : 's'}
            {set.hiddenDuplicateCount > 0
              ? ` · ${set.hiddenDuplicateCount} older cop${set.hiddenDuplicateCount === 1 ? 'y' : 'ies'} hidden`
              : ''}
          </span>
        </span>
      </button>
    </li>
  )
}

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
    <div className="app">
      <div className="setup-screen">
        <div className="app-brand" style={{ marginBottom: '1.25rem' }}>
          <span className="app-brand-mark" />
          <h1 style={{ margin: 0, fontSize: '1.25rem' }}>Osu Meta</h1>
        </div>
        <p>
          Select your osu! <strong>Songs</strong> folder. The app lists beatmap sets and updates
          metadata across all difficulties at once.
        </p>

        <ul className="detected-list">
          {detected.map((item) => (
            <li key={item.path}>
              <span className={item.exists ? 'exists' : 'missing'}>
                {item.exists ? 'Found' : 'Not found'} — {item.label}
              </span>
              <div className="settings-path" style={{ maxWidth: 'none', marginTop: '0.25rem' }}>
                {item.path}
              </div>
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
  const { artist: lockArtistRomanized, title: lockTitleRomanized } = useMemo(
    () => getRomanizedFieldLocks(metadata),
    [metadata.artistUnicode, metadata.titleUnicode]
  )

  const update = (key: keyof BeatmapMetadata, value: string): void => {
    const next = { ...metadata, [key]: value }
    if (key === 'artistUnicode' && isAlreadyRomanized(value)) {
      next.artist = value
    }
    if (key === 'titleUnicode' && isAlreadyRomanized(value)) {
      next.title = value
    }
    onChange(next)
  }

  const hasBg = Boolean(selected.backgroundImageUrl)

  return (
    <div className="editor-panel">
      <div className={`editor-hero ${hasBg ? '' : 'editor-hero--placeholder'}`}>
        {hasBg && (
          <img
            className="editor-hero-bg"
            src={selected.backgroundImageUrl!}
            alt=""
            draggable={false}
          />
        )}
        <span className="editor-hero-overlay" aria-hidden />
        <div className="editor-hero-content">
          <h2>{selected.displayName}</h2>
          <p>
            {selected.folderName} · {selected.diffCount} difficult
            {selected.diffCount === 1 ? 'y' : 'ies'}
            {selected.lastModifiedAt > 0 ? ` · Updated ${formatLastModified(selected.lastModifiedAt)}` : ''}
          </p>
          {selected.hiddenDuplicateCount > 0 && (
            <p className="duplicate-note">
              Showing the newest of {selected.hiddenDuplicateCount + 1} copies on disk (BeatmapSetID{' '}
              {selected.beatmapSetId ?? 'unknown'}). Older duplicate folders are hidden.
            </p>
          )}
        </div>
      </div>

      <div className="editor-body">
        {mismatched && (
          <p className="alert">
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
          <div className={`field ${lockArtistRomanized ? 'field-locked' : ''}`}>
            <label htmlFor="artist">Romanized artist name</label>
            <input
              id="artist"
              value={metadata.artist}
              onChange={(e) => update('artist', e.target.value)}
              disabled={lockArtistRomanized}
              title={
                lockArtistRomanized
                  ? 'Already romanized — matches artist name automatically'
                  : undefined
              }
            />
            {lockArtistRomanized && (
              <span className="field-hint">Matches artist name (already romanized)</span>
            )}
          </div>
          <div className="field">
            <label htmlFor="titleUnicode">Song title</label>
            <input
              id="titleUnicode"
              value={metadata.titleUnicode}
              onChange={(e) => update('titleUnicode', e.target.value)}
            />
          </div>
          <div className={`field ${lockTitleRomanized ? 'field-locked' : ''}`}>
            <label htmlFor="title">Romanized song title</label>
            <input
              id="title"
              value={metadata.title}
              onChange={(e) => update('title', e.target.value)}
              disabled={lockTitleRomanized}
              title={
                lockTitleRomanized
                  ? 'Already romanized — matches song title automatically'
                  : undefined
              }
            />
            {lockTitleRomanized && (
              <span className="field-hint">Matches song title (already romanized)</span>
            )}
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
      const toSave = applyRomanizedFieldLocks(metadata, getRomanizedFieldLocks(metadata))
      const result = await window.api.saveMetadata(selected.folderPath, toSave)
      setMismatched(false)
      setStatus(`Updated ${result.updatedFiles} .osu file(s).`)
      await loadBeatmaps()
      const refreshed = (await window.api.scanBeatmaps()).find(
        (b) => b.folderPath === selected.folderPath
      )
      if (refreshed) setSelected(refreshed)
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
        <div className="app-brand">
          <span className="app-brand-mark" />
          <h1>Osu Meta</h1>
        </div>
        <div className="app-header-actions">
          <span className="settings-path" title={songsPath}>
            {songsPath}
          </span>
          <button className="btn btn-ghost" type="button" onClick={onChangeFolder}>
            Change folder
          </button>
          <button className="btn btn-ghost" type="button" onClick={loadBeatmaps} disabled={loadingList}>
            Rescan
          </button>
        </div>
      </header>

      <div className="banner">Close osu! before saving so your changes are not overwritten.</div>

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
            {filtered.length === 0 && !loadingList ? (
              <li className="map-list-empty">No beatmaps match your search.</li>
            ) : (
              filtered.map((set) => (
                <MapListItem
                  key={set.folderPath}
                  set={set}
                  active={selected?.folderPath === set.folderPath}
                  onSelect={() => void selectBeatmap(set)}
                />
              ))
            )}
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
            <span className="editor-empty-icon">♪</span>
            <p>
              {loadingMeta
                ? 'Loading metadata…'
                : 'Select a beatmap set to edit artist, title, and tags.'}
            </p>
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
    return <div className="loading-screen">Loading…</div>
  }

  if (!songsPath) {
    return <SetupScreen onReady={setSongsPath} />
  }

  return <MainScreen songsPath={songsPath} onChangeFolder={() => void handleChangeFolder()} />
}
