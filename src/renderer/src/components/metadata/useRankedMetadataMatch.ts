import { useDebouncedValue } from '@mantine/hooks'
import { useEffect, useMemo, useRef, useState } from 'react'
import { canLookupRankedGenreLanguageTags } from '@shared/genre-language-tags'
import type { BeatmapMetadata, RankedMetadataMatch } from '@shared/types'

interface UseRankedMetadataMatchOptions {
  metadata: BeatmapMetadata
  beatmapSetId: number | null
  isOnOsuWebsite: boolean
  folderPath: string
  /** When false, skip network lookup (e.g. artist/title not filled yet). */
  enabled?: boolean
}

interface UseRankedMetadataMatchResult {
  match: RankedMetadataMatch | null
  loading: boolean
}

export function useRankedMetadataMatch({
  metadata,
  beatmapSetId,
  isOnOsuWebsite,
  folderPath,
  enabled = true
}: UseRankedMetadataMatchOptions): UseRankedMetadataMatchResult {
  const [match, setMatch] = useState<RankedMetadataMatch | null>(null)
  const [loading, setLoading] = useState(false)
  const lastFetchedLookupKeyRef = useRef<string | null>(null)

  const canLookup = canLookupRankedGenreLanguageTags(
    metadata.artistUnicode,
    metadata.artist,
    metadata.titleUnicode,
    metadata.title
  )

  const lookupKey = useMemo(
    () =>
      [
        metadata.artistUnicode,
        metadata.artist,
        metadata.titleUnicode,
        metadata.title,
        isOnOsuWebsite ? String(beatmapSetId ?? 0) : '0'
      ].join('\u001f'),
    [
      metadata.artistUnicode,
      metadata.artist,
      metadata.titleUnicode,
      metadata.title,
      isOnOsuWebsite,
      beatmapSetId
    ]
  )
  const [debouncedLookupKey] = useDebouncedValue(lookupKey, 500)

  useEffect(() => {
    setMatch(null)
    lastFetchedLookupKeyRef.current = null
  }, [folderPath])

  useEffect(() => {
    if (!enabled || !canLookup) {
      setMatch(null)
      setLoading(false)
      lastFetchedLookupKeyRef.current = null
      return
    }

    if (lastFetchedLookupKeyRef.current === debouncedLookupKey) {
      return
    }

    lastFetchedLookupKeyRef.current = debouncedLookupKey

    let cancelled = false
    setLoading(true)

    void window.api
      .suggestRankedMetadataMatch({
        artistUnicode: metadata.artistUnicode,
        artist: metadata.artist,
        titleUnicode: metadata.titleUnicode,
        title: metadata.title,
        beatmapSetId: isOnOsuWebsite ? beatmapSetId : null
      })
      .then((result) => {
        if (!cancelled) {
          setMatch(result.kind === 'found' ? result.match : null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [
    enabled,
    canLookup,
    debouncedLookupKey,
    metadata.artistUnicode,
    metadata.artist,
    metadata.titleUnicode,
    metadata.title,
    folderPath,
    beatmapSetId,
    isOnOsuWebsite
  ])

  return { match, loading }
}
