import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Group,
  Text,
  Textarea,
  Tooltip
} from '@mantine/core'
import { IconAlertTriangle, IconX } from '@tabler/icons-react'
import { useDebouncedValue } from '@mantine/hooks'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  getSuggestedFeaturedArtistTags,
  getSuggestedMappersGuildQuestTags,
  hasPartialFeaturedArtistTags
} from '@shared/featured-artist'
import {
  canLookupRankedGenreLanguageTags,
  buildGenreLanguageTagSuggestions,
  type GenreLanguageTagSuggestion
} from '@shared/genre-language-tags'
import { getTagHintSuggestions, hasMatchableTagHints } from '@shared/tag-hints'
import type {
  GuestMapperTagSuggestion,
  RankedGenreLanguageSuggestion,
  SetOwnerAlternateTagSuggestion,
  TagSectionsExpanded
} from '@shared/types'
import { getWrongTagSuggestions, removeTagByValue } from '@shared/wrong-tags'
import {
  addTag,
  getArtistTitleTagOccurrences,
  hasArtistTitleTags,
  removeArtistTitleTags,
  tagListIncludes
} from '@shared/tags'
import TagSuggestionsPanel, { type TagSuggestionCategory } from './TagSuggestionsPanel'

interface TagsFieldProps {
  folderPath: string
  tags: string
  artistUnicode: string
  artist: string
  titleUnicode: string
  title: string
  folderName: string
  source: string
  beatmapSetId: number | null
  isOnOsuWebsite: boolean
  isFeaturedArtist: boolean
  /** True when osu! marks the set FA or the loaded map already had FA tags. */
  featuredArtistContext: boolean
  tagSectionsExpanded: TagSectionsExpanded
  onTagSectionsExpandedChange: (value: TagSectionsExpanded) => void
  onChange: (tags: string) => void
}

function RankedSetTooltipLabel({
  beatmapSetId,
  variant
}: {
  beatmapSetId: number
  variant: 'tags' | 'page' | 'gd'
}): JSX.Element {
  const prefix =
    variant === 'page' ? 'From the page' : variant === 'gd' ? 'From your last GD' : 'From the set'

  return (
    <Text size="xs" lh={1.4}>
      {prefix}{' '}
      <Text
        component="span"
        size="xs"
        td="underline"
        className="mv-tag-tooltip-link"
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          void window.api.openBeatmapPage(beatmapSetId)
        }}
      >
        #{beatmapSetId}
      </Text>
    </Text>
  )
}

export default function TagsField({
  folderPath,
  tags,
  artistUnicode,
  artist,
  titleUnicode,
  title,
  folderName,
  source,
  beatmapSetId,
  isOnOsuWebsite,
  isFeaturedArtist,
  featuredArtistContext,
  tagSectionsExpanded: _tagSectionsExpanded,
  onTagSectionsExpandedChange: _onTagSectionsExpandedChange,
  onChange
}: TagsFieldProps): JSX.Element {
  const hintContext = useMemo(
    () => ({ titleUnicode, title, folderName, source }),
    [titleUnicode, title, folderName, source]
  )

  const [dismissedWrongIds, setDismissedWrongIds] = useState<string[]>([])
  const [artistTitleTagsIgnored, setArtistTitleTagsIgnored] = useState(false)
  const [apiGuestSuggestions, setApiGuestSuggestions] = useState<GuestMapperTagSuggestion[]>([])
  const [apiGuestLoading, setApiGuestLoading] = useState(false)
  const [hostAlternateSuggestions, setHostAlternateSuggestions] = useState<
    SetOwnerAlternateTagSuggestion[]
  >([])
  const [hostAlternateLoading, setHostAlternateLoading] = useState(false)
  const [rankedTagSource, setRankedTagSource] = useState<RankedGenreLanguageSuggestion | null>(null)
  const [rankedTagsLoading, setRankedTagsLoading] = useState(false)
  const [metadataIsFeaturedArtist, setMetadataIsFeaturedArtist] = useState(false)
  const rankedLookupGenerationRef = useRef(0)
  const lastFetchedRankedLookupKeyRef = useRef<string | null>(null)

  const canLookupRankedTags = canLookupRankedGenreLanguageTags(
    artistUnicode,
    artist,
    titleUnicode,
    title
  )

  const rankedLookupKey = useMemo(
    () => [artistUnicode, artist, titleUnicode, title].join('\u001f'),
    [artistUnicode, artist, titleUnicode, title]
  )
  const [debouncedRankedLookupKey] = useDebouncedValue(rankedLookupKey, 500)

  const [tagsFieldFocused, setTagsFieldFocused] = useState(false)
  const [tagSuggestionsOpen, setTagSuggestionsOpen] = useState(false)
  const [activeTagCategory, setActiveTagCategory] = useState<keyof TagSectionsExpanded>(
    isOnOsuWebsite ? 'featured' : 'language'
  )

  const suggestionsPanelActive = tagSuggestionsOpen || tagsFieldFocused
  const shouldFetchGenreLanguageSuggestions =
    canLookupRankedTags && (isOnOsuWebsite ? suggestionsPanelActive : true)
  const shouldFetchSetBoundSuggestions = isOnOsuWebsite && suggestionsPanelActive

  useEffect(() => {
    setTagSuggestionsOpen(false)
    setActiveTagCategory(isOnOsuWebsite ? 'featured' : 'language')
    setTagsFieldFocused(false)
    lastFetchedRankedLookupKeyRef.current = null
  }, [folderPath, isOnOsuWebsite])

  useEffect(() => {
    void window.api.isArtistTitleTagWarningIgnored(folderPath).then(setArtistTitleTagsIgnored)
    void window.api.getDismissedWrongTagHints(folderPath).then(setDismissedWrongIds)
  }, [folderPath])

  useEffect(() => {
    if (!shouldFetchSetBoundSuggestions) {
      setApiGuestSuggestions([])
      setApiGuestLoading(false)
      return
    }

    if (beatmapSetId == null || beatmapSetId <= 0) {
      setApiGuestSuggestions([])
      setApiGuestLoading(false)
      return
    }

    let cancelled = false
    setApiGuestLoading(true)

    void window.api
      .suggestGuestMapperApiTags(beatmapSetId)
      .then((suggestions) => {
        if (!cancelled) setApiGuestSuggestions(suggestions)
      })
      .catch(() => {
        if (!cancelled) setApiGuestSuggestions([])
      })
      .finally(() => {
        if (!cancelled) setApiGuestLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [beatmapSetId, shouldFetchSetBoundSuggestions])

  useEffect(() => {
    if (!shouldFetchSetBoundSuggestions) {
      setHostAlternateSuggestions([])
      setHostAlternateLoading(false)
      return
    }

    if (beatmapSetId == null || beatmapSetId <= 0) {
      setHostAlternateSuggestions([])
      setHostAlternateLoading(false)
      return
    }

    let cancelled = false
    setHostAlternateLoading(true)

    void window.api
      .suggestHostAlternateNameTags(beatmapSetId)
      .then((suggestions) => {
        if (!cancelled) setHostAlternateSuggestions(suggestions)
      })
      .catch(() => {
        if (!cancelled) setHostAlternateSuggestions([])
      })
      .finally(() => {
        if (!cancelled) setHostAlternateLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [beatmapSetId, shouldFetchSetBoundSuggestions])

  useEffect(() => {
    if (!shouldFetchGenreLanguageSuggestions) {
      setRankedTagSource(null)
      setMetadataIsFeaturedArtist(false)
      setRankedTagsLoading(false)
      lastFetchedRankedLookupKeyRef.current = null
      return
    }

    if (!canLookupRankedTags) {
      setRankedTagSource(null)
      setMetadataIsFeaturedArtist(false)
      setRankedTagsLoading(false)
      lastFetchedRankedLookupKeyRef.current = null
      return
    }

    if (lastFetchedRankedLookupKeyRef.current === debouncedRankedLookupKey) {
      return
    }

    lastFetchedRankedLookupKeyRef.current = debouncedRankedLookupKey

    const generation = ++rankedLookupGenerationRef.current
    setRankedTagsLoading(true)

    void window.api
      .suggestRankedGenreLanguage({
        artistUnicode,
        artist,
        titleUnicode,
        title,
        beatmapSetId: isOnOsuWebsite ? beatmapSetId : null
      })
      .then((result) => {
        if (rankedLookupGenerationRef.current !== generation) return
        setRankedTagSource(result.kind === 'found' ? result.suggestion : null)
        setMetadataIsFeaturedArtist(
          result.kind === 'found' || result.kind === 'not_found'
            ? (result.isFeaturedArtist ?? false)
            : false
        )
      })
      .catch(() => {
        if (rankedLookupGenerationRef.current !== generation) return
        setRankedTagSource(null)
        setMetadataIsFeaturedArtist(false)
      })
      .finally(() => {
        if (rankedLookupGenerationRef.current === generation) {
          setRankedTagsLoading(false)
        }
      })
  }, [
    shouldFetchGenreLanguageSuggestions,
    debouncedRankedLookupKey,
    canLookupRankedTags,
    artistUnicode,
    artist,
    titleUnicode,
    title,
    beatmapSetId,
    isOnOsuWebsite
  ])

  useEffect(() => {
    if (
      !hasArtistTitleTags(tags, artistUnicode, artist, titleUnicode, title, source) &&
      artistTitleTagsIgnored
    ) {
      setArtistTitleTagsIgnored(false)
      void window.api.setArtistTitleTagWarningIgnored(folderPath, false)
    }
  }, [tags, artistUnicode, artist, titleUnicode, title, source, artistTitleTagsIgnored, folderPath])

  const visibleGuestSuggestions = useMemo(
    () => apiGuestSuggestions.filter(({ tag }) => !tagListIncludes(tags, tag)),
    [apiGuestSuggestions, tags]
  )

  const apiCurrentGuestTags = useMemo(
    () => visibleGuestSuggestions.filter(({ kind }) => kind === 'current'),
    [visibleGuestSuggestions]
  )

  const apiPreviousGuestTags = useMemo(
    () => visibleGuestSuggestions.filter(({ kind }) => kind === 'previous'),
    [visibleGuestSuggestions]
  )

  const visibleHostAlternateSuggestions = useMemo(
    () => hostAlternateSuggestions.filter(({ tag }) => !tagListIncludes(tags, tag)),
    [hostAlternateSuggestions, tags]
  )

  const suggestFeaturedArtistTags =
    isFeaturedArtist ||
    metadataIsFeaturedArtist ||
    featuredArtistContext ||
    hasPartialFeaturedArtistTags(tags)

  const featuredArtistTags = useMemo(
    () => getSuggestedFeaturedArtistTags(tags, suggestFeaturedArtistTags),
    [tags, suggestFeaturedArtistTags]
  )

  const mappersGuildTags = useMemo(
    () => getSuggestedMappersGuildQuestTags(tags, suggestFeaturedArtistTags),
    [tags, suggestFeaturedArtistTags]
  )

  const patternHints = useMemo(() => getTagHintSuggestions(tags, hintContext), [tags, hintContext])

  const wrongTagSuggestions = useMemo(
    () => getWrongTagSuggestions(tags, hintContext, dismissedWrongIds),
    [tags, hintContext, dismissedWrongIds]
  )

  const rankedTagSuggestions = useMemo(() => {
    if (!rankedTagSource) return { genre: [], language: [] }
    return buildGenreLanguageTagSuggestions(
      tags,
      rankedTagSource.rankedTags,
      rankedTagSource.pageGenre,
      rankedTagSource.pageLanguage
    )
  }, [tags, rankedTagSource])
  const visibleLanguageTags = rankedTagSuggestions.language
  const visibleGenreTags = rankedTagSuggestions.genre

  const showFeaturedSection = suggestFeaturedArtistTags
  const showSourceSection = isOnOsuWebsite && hasMatchableTagHints(hintContext)
  const showLanguageSection = canLookupRankedTags
  const showGenreSection = canLookupRankedTags
  const showGuestSection = isOnOsuWebsite && beatmapSetId != null && beatmapSetId > 0
  const showCollabSection = isOnOsuWebsite && beatmapSetId != null && beatmapSetId > 0
  const showGuildSection = suggestFeaturedArtistTags
  const showWrongTagsSection = isOnOsuWebsite && wrongTagSuggestions.length > 0

  const artistTitleTagOccurrences = useMemo(
    () => getArtistTitleTagOccurrences(tags, artistUnicode, artist, titleUnicode, title, source),
    [tags, artistUnicode, artist, titleUnicode, title, source]
  )
  const hasArtistTitleTagIssue = artistTitleTagOccurrences.length > 0
  const showArtistTitleTagUi = hasArtistTitleTagIssue && !artistTitleTagsIgnored

  const ignoreArtistTitleTags = (): void => {
    setArtistTitleTagsIgnored(true)
    void window.api.setArtistTitleTagWarningIgnored(folderPath, true)
  }

  const removeArtistTitleTagMatches = (): void => {
    onChange(removeArtistTitleTags(tags, artistUnicode, artist, titleUnicode, title, source))
  }

  const dismissWrongTag = (ruleId: string): void => {
    setDismissedWrongIds((current) => [...current, ruleId])
    void window.api.dismissWrongTagHint(folderPath, ruleId)
  }

  const patternPills = patternHints.map(({ tag, reason }) => (
    <Tooltip key={`hint-${tag}`} label={reason}>
      <Badge
        className="mv-tag-suggestion-pill"
        variant="light"
        color="violet"
        onClick={() => onChange(addTag(tags, tag))}
      >
        + {tag}
      </Badge>
    </Tooltip>
  ))

  const wrongTagPills =
    wrongTagSuggestions.length > 0
      ? wrongTagSuggestions.map(({ id, tag, reason }) => (
          <Tooltip key={id} label={reason}>
            <Badge
              variant="light"
              color="orange"
              pr={3}
              rightSection={
                <ActionIcon
                  size="xs"
                  color="orange"
                  variant="transparent"
                  aria-label={`Remove ${tag}`}
                  onClick={() => onChange(removeTagByValue(tags, tag))}
                >
                  <IconX size={12} />
                </ActionIcon>
              }
            >
              − {tag}
            </Badge>
          </Tooltip>
        ))
      : null

  const tagCategories = useMemo((): TagSuggestionCategory[] => {
    const pills = (items: string[], color: string, keyPrefix: string) =>
      items.map((tag) => (
        <Badge
          key={`${keyPrefix}-${tag}`}
          className="mv-tag-suggestion-pill"
          variant="light"
          color={color}
          onClick={() => onChange(addTag(tags, tag))}
        >
          + {tag}
        </Badge>
      ))

    const rankedGenreLanguagePill = (
      suggestion: GenreLanguageTagSuggestion,
      color: string
    ): JSX.Element => {
      const setId = rankedTagSource?.beatmapSetId
      const tooltipLabel =
        setId != null ? (
          <RankedSetTooltipLabel
            beatmapSetId={setId}
            variant={suggestion.source === 'beatmap_page' ? 'page' : 'tags'}
          />
        ) : suggestion.source === 'beatmap_page' ? (
          'From the page'
        ) : (
          'From the set'
        )

      return (
        <Tooltip
          key={`${suggestion.source}-${suggestion.tag}`}
          label={tooltipLabel}
          closeDelay={300}
          classNames={{ tooltip: 'mv-tag-tooltip' }}
        >
          <Badge
            className={`mv-tag-suggestion-pill${suggestion.source === 'beatmap_page' ? ' mv-tag-suggestion-pill--page' : ''}`}
            variant={suggestion.source === 'beatmap_page' ? 'outline' : 'light'}
            color={color}
            onClick={() => onChange(addTag(tags, suggestion.tag))}
          >
            + {suggestion.tag}
          </Badge>
        </Tooltip>
      )
    }

    const guestContent = (
      <>
        {apiCurrentGuestTags.map(({ mapperUsername, tag }) => (
          <Tooltip key={`api-current-${mapperUsername}-${tag}`} label={`Guest · ${mapperUsername}`}>
            <Badge
              className="mv-tag-suggestion-pill"
              variant="light"
              color="blue"
              onClick={() => onChange(addTag(tags, tag))}
            >
              + {tag}
            </Badge>
          </Tooltip>
        ))}
        {apiPreviousGuestTags.map(({ mapperUsername, tag }) => (
          <Tooltip key={`api-prev-${mapperUsername}-${tag}`} label={`Old username · ${mapperUsername}`}>
            <Badge
              className="mv-tag-suggestion-pill"
              variant="light"
              color="grape"
              onClick={() => onChange(addTag(tags, tag))}
            >
              + {tag}
            </Badge>
          </Tooltip>
        ))}
      </>
    )

    return [
      {
        key: 'featured',
        label: 'Featured',
        description: 'Featured artist tags expected on osu! FA maps.',
        suggestionCount: featuredArtistTags.length,
        visible: showFeaturedSection,
        chipColor: 'yellow',
        content: pills(featuredArtistTags, 'yellow', 'fa')
      },
      {
        key: 'source',
        label: 'Source',
        description: 'Tags commonly inferred from the title, folder, or source field.',
        suggestionCount: patternHints.length,
        visible: showSourceSection,
        chipColor: 'violet',
        content: patternPills
      },
      {
        key: 'language',
        label: 'Language',
        description: 'From the latest ranked set on osu!.',
        suggestionCount: visibleLanguageTags.length,
        loading: rankedTagsLoading,
        visible: showLanguageSection,
        chipColor: 'teal',
        content: visibleLanguageTags.map((suggestion) =>
          rankedGenreLanguagePill(suggestion, 'teal')
        )
      },
      {
        key: 'genre',
        label: 'Genre',
        description: 'From the latest ranked set on osu!.',
        suggestionCount: visibleGenreTags.length,
        loading: rankedTagsLoading,
        visible: showGenreSection,
        chipColor: 'grape',
        content: visibleGenreTags.map((suggestion) =>
          rankedGenreLanguagePill(suggestion, 'grape')
        )
      },
      {
        key: 'guest',
        label: 'Guests',
        description: 'Guest mapper tags from osu! for difficulties on this set.',
        suggestionCount: visibleGuestSuggestions.length,
        loading: apiGuestLoading,
        visible: showGuestSection,
        chipColor: 'blue',
        content: guestContent
      },
      {
        key: 'collab',
        label: 'Aliases',
        description: 'your old usernames from your latest ranked set/ GD.',
        suggestionCount: visibleHostAlternateSuggestions.length,
        loading: hostAlternateLoading,
        visible: showCollabSection,
        chipColor: 'cyan',
        content: visibleHostAlternateSuggestions.map((suggestion) => (
          <Tooltip
            key={`host-alt-${suggestion.previousUsername}-${suggestion.tag}`}
            label={
              <RankedSetTooltipLabel
                beatmapSetId={suggestion.sourceBeatmapSetId}
                variant="gd"
              />
            }
            closeDelay={300}
            classNames={{ tooltip: 'mv-tag-tooltip' }}
          >
            <Badge
              className="mv-tag-suggestion-pill"
              variant="light"
              color="cyan"
              onClick={() => onChange(addTag(tags, suggestion.tag))}
            >
              + {suggestion.tag}
            </Badge>
          </Tooltip>
        ))
      },
      {
        key: 'guild',
        label: 'Guild',
        description: 'Mappers Guild quest tags for featured artist sets.',
        suggestionCount: mappersGuildTags.length,
        visible: showGuildSection,
        chipColor: 'blue',
        content: pills(mappersGuildTags, 'blue', 'guild')
      },
      {
        key: 'wrongTags',
        label: 'Warnings',
        description: 'Tags that may be incorrect or discouraged for this map.',
        suggestionCount: wrongTagSuggestions.length,
        visible: showWrongTagsSection,
        chipColor: 'orange',
        content: wrongTagPills
      }
    ]
  }, [
    apiCurrentGuestTags,
    apiPreviousGuestTags,
    apiGuestLoading,
    featuredArtistTags,
    hostAlternateLoading,
    mappersGuildTags,
    onChange,
    patternHints.length,
    patternPills,
    rankedTagSource,
    rankedTagsLoading,
    showCollabSection,
    showFeaturedSection,
    showGenreSection,
    showGuestSection,
    showGuildSection,
    showLanguageSection,
    showSourceSection,
    showWrongTagsSection,
    tags,
    visibleGenreTags,
    visibleGuestSuggestions.length,
    visibleHostAlternateSuggestions,
    visibleLanguageTags,
    wrongTagPills,
    wrongTagSuggestions.length
  ])

  return (
    <Box className="mv-field-wrap">
      <Text size="xs" c="dimmed" mb={4}>
        Tags
      </Text>

      <Textarea
        value={tags}
        onChange={(e) => onChange(e.currentTarget.value)}
        onFocus={() => setTagsFieldFocused(true)}
        onBlur={() => setTagsFieldFocused(false)}
        minRows={3}
        autosize
        mb="sm"
      />

      <TagSuggestionsPanel
        categories={tagCategories}
        panelOpen={tagSuggestionsOpen}
        onPanelOpenChange={setTagSuggestionsOpen}
        activeKey={activeTagCategory}
        onActiveKeyChange={setActiveTagCategory}
        disabled={!canLookupRankedTags}
        hint={
          !isOnOsuWebsite && canLookupRankedTags
            ? 'Guest, alias, and source suggestions unlock after the map is submitted.'
            : undefined
        }
      />

      {showArtistTitleTagUi && (
        <Alert icon={<IconAlertTriangle />} color="red" variant="light" mb="xs">
          <Group justify="space-between" align="flex-start" wrap="nowrap" gap="sm">
            <Text size="sm" style={{ flex: 1 }}>
              Artist, title, and source must not appear in tags as a complete phrase (
              {artistTitleTagOccurrences.map(({ tag }) => tag).join(', ')}). Partial words are fine
              — for example, if the title is &quot;aura game&quot;, the tag &quot;aura&quot; is
              allowed but &quot;aura game&quot; is not.
            </Text>
            <Group gap={6} wrap="nowrap">
              <Button variant="subtle" color="red" size="compact-sm" onClick={removeArtistTitleTagMatches}>
                Remove tags
              </Button>
              <Button variant="subtle" color="red" size="compact-sm" onClick={ignoreArtistTitleTags}>
                Ignore
              </Button>
            </Group>
          </Group>
        </Alert>
      )}

      {wrongTagSuggestions.length > 0 && (
        <Group justify="flex-end" mt="xs">
          <Button
            size="compact-xs"
            variant="subtle"
            color="orange"
            onClick={() => {
              for (const { id } of wrongTagSuggestions) dismissWrongTag(id)
            }}
          >
            Dismiss tag warnings
          </Button>
        </Group>
      )}
    </Box>
  )
}
