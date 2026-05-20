import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Collapse,
  Group,
  Text,
  Textarea,
  Tooltip,
  UnstyledButton
} from '@mantine/core'
import { IconAlertTriangle, IconChevronDown, IconChevronRight, IconX } from '@tabler/icons-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { getSuggestedCollabTags } from '@shared/collab'
import {
  getSuggestedFeaturedArtistTags,
  getSuggestedMappersGuildQuestTags
} from '@shared/featured-artist'
import { getSuggestedGuestMapperTags } from '@shared/guest-mapper'
import { getTagHintSuggestions } from '@shared/tag-hints'
import type { TagSectionsExpanded } from '@shared/types'
import { getWrongTagSuggestions, removeTagByValue } from '@shared/wrong-tags'
import {
  addTag,
  getArtistTitleTagOccurrences,
  getDuplicateTagOccurrences,
  hasArtistTitleTags,
  hasDuplicateTags,
  removeArtistTitleTags,
  removeTagAtIndex
} from '@shared/tags'

interface TagsFieldProps {
  folderPath: string
  tags: string
  artistUnicode: string
  artist: string
  titleUnicode: string
  title: string
  folderName: string
  source: string
  difficultyVersions: string[]
  creator: string
  isFeaturedArtist: boolean
  tagSectionsExpanded: TagSectionsExpanded
  onTagSectionsExpandedChange: (value: TagSectionsExpanded) => void
  onChange: (tags: string) => void
}

function CollapsibleTagSection({
  sectionKey,
  label,
  expanded,
  onToggle,
  children
}: {
  sectionKey: keyof TagSectionsExpanded
  label: string
  expanded: boolean
  onToggle: (key: keyof TagSectionsExpanded) => void
  children: ReactNode
}): JSX.Element | null {
  if (children == null) return null

  return (
    <Box mb="xs">
      <UnstyledButton
        onClick={() => onToggle(sectionKey)}
        style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}
      >
        {expanded ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
        <Text size="xs" c="dimmed">
          {label}
        </Text>
      </UnstyledButton>
      <Collapse in={expanded}>
        <Group gap={6}>{children}</Group>
      </Collapse>
    </Box>
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
  difficultyVersions,
  creator,
  isFeaturedArtist,
  tagSectionsExpanded,
  onTagSectionsExpandedChange,
  onChange
}: TagsFieldProps): JSX.Element {
  const hintContext = useMemo(
    () => ({ titleUnicode, title, folderName, source }),
    [titleUnicode, title, folderName, source]
  )

  const [dismissedWrongIds, setDismissedWrongIds] = useState<string[]>([])
  const [duplicateIgnored, setDuplicateIgnored] = useState(false)
  const [artistTitleTagsIgnored, setArtistTitleTagsIgnored] = useState(false)
  const [duplicatesOpen, setDuplicatesOpen] = useState(false)

  useEffect(() => {
    void window.api.isDuplicateWarningIgnored(folderPath).then(setDuplicateIgnored)
    void window.api.isArtistTitleTagWarningIgnored(folderPath).then(setArtistTitleTagsIgnored)
    void window.api.getDismissedWrongTagHints(folderPath).then(setDismissedWrongIds)
    setDuplicatesOpen(false)
  }, [folderPath])

  useEffect(() => {
    if (!hasDuplicateTags(tags) && duplicateIgnored) {
      setDuplicateIgnored(false)
      void window.api.setDuplicateWarningIgnored(folderPath, false)
    }
  }, [tags, duplicateIgnored, folderPath])

  useEffect(() => {
    if (
      !hasArtistTitleTags(tags, artistUnicode, artist, titleUnicode, title, source) &&
      artistTitleTagsIgnored
    ) {
      setArtistTitleTagsIgnored(false)
      void window.api.setArtistTitleTagWarningIgnored(folderPath, false)
    }
  }, [tags, artistUnicode, artist, titleUnicode, title, source, artistTitleTagsIgnored, folderPath])

  const guestMapperTags = useMemo(
    () => getSuggestedGuestMapperTags(difficultyVersions, tags, creator),
    [difficultyVersions, tags, creator]
  )

  const collabTags = useMemo(
    () => getSuggestedCollabTags(difficultyVersions, tags, creator),
    [difficultyVersions, tags, creator]
  )

  const featuredArtistTags = useMemo(
    () => getSuggestedFeaturedArtistTags(tags, isFeaturedArtist),
    [tags, isFeaturedArtist]
  )

  const mappersGuildTags = useMemo(() => getSuggestedMappersGuildQuestTags(tags), [tags])

  const patternHints = useMemo(() => getTagHintSuggestions(tags, hintContext), [tags, hintContext])

  const wrongTagSuggestions = useMemo(
    () => getWrongTagSuggestions(tags, hintContext, dismissedWrongIds),
    [tags, hintContext, dismissedWrongIds]
  )

  const duplicateOccurrences = useMemo(() => getDuplicateTagOccurrences(tags), [tags])
  const hasDuplicates = hasDuplicateTags(tags)
  const showDuplicateUi = hasDuplicates && !duplicateIgnored

  useEffect(() => {
    if (!showDuplicateUi) setDuplicatesOpen(false)
  }, [showDuplicateUi])

  const artistTitleTagOccurrences = useMemo(
    () => getArtistTitleTagOccurrences(tags, artistUnicode, artist, titleUnicode, title, source),
    [tags, artistUnicode, artist, titleUnicode, title, source]
  )
  const hasArtistTitleTagIssue = artistTitleTagOccurrences.length > 0
  const showArtistTitleTagUi = hasArtistTitleTagIssue && !artistTitleTagsIgnored

  const toggleSection = (key: keyof TagSectionsExpanded): void => {
    onTagSectionsExpandedChange({
      ...tagSectionsExpanded,
      [key]: !tagSectionsExpanded[key]
    })
  }

  const ignoreDuplicates = (): void => {
    setDuplicateIgnored(true)
    void window.api.setDuplicateWarningIgnored(folderPath, true)
  }

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

  const addPills = (items: string[], color: string, keyPrefix: string) =>
    items.map((tag) => (
      <Badge
        key={`${keyPrefix}-${tag}`}
        variant="light"
        color={color}
        style={{ cursor: 'pointer' }}
        onClick={() => onChange(addTag(tags, tag))}
      >
        + {tag}
      </Badge>
    ))

  const patternPills =
    patternHints.length > 0
      ? patternHints.map(({ tag, reason }) => (
          <Tooltip key={`hint-${tag}`} label={reason}>
            <Badge
              variant="light"
              color="violet"
              style={{ cursor: 'pointer' }}
              onClick={() => onChange(addTag(tags, tag))}
            >
              + {tag}
            </Badge>
          </Tooltip>
        ))
      : null

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

  return (
    <Box>
      <Text size="xs" c="dimmed" mb={4}>
        Tags
      </Text>

      {featuredArtistTags.length > 0 && (
        <CollapsibleTagSection
          sectionKey="featured"
          label="Suggested tags (featured artist)"
          expanded={tagSectionsExpanded.featured}
          onToggle={toggleSection}
        >
          {addPills(featuredArtistTags, 'yellow', 'fa')}
        </CollapsibleTagSection>
      )}

      <CollapsibleTagSection
        sectionKey="source"
        label="Suggested tags (source / title)"
        expanded={tagSectionsExpanded.source}
        onToggle={toggleSection}
      >
        {patternPills}
      </CollapsibleTagSection>

      <CollapsibleTagSection
        sectionKey="guest"
        label="Suggested tags (guest mappers)"
        expanded={tagSectionsExpanded.guest}
        onToggle={toggleSection}
      >
        {guestMapperTags.length > 0 ? addPills(guestMapperTags, 'blue', 'guest') : null}
      </CollapsibleTagSection>

      <CollapsibleTagSection
        sectionKey="collab"
        label="Suggested tags (collabs)"
        expanded={tagSectionsExpanded.collab}
        onToggle={toggleSection}
      >
        {collabTags.length > 0 ? addPills(collabTags, 'cyan', 'collab') : null}
      </CollapsibleTagSection>

      <CollapsibleTagSection
        sectionKey="guild"
        label="If this map is for a mappers' guild quest, add also these:"
        expanded={tagSectionsExpanded.guild}
        onToggle={toggleSection}
      >
        {mappersGuildTags.length > 0 ? addPills(mappersGuildTags, 'blue', 'guild') : null}
      </CollapsibleTagSection>

      <CollapsibleTagSection
        sectionKey="wrongTags"
        label="Tags that may not fit this track"
        expanded={tagSectionsExpanded.wrongTags}
        onToggle={toggleSection}
      >
        {wrongTagPills}
      </CollapsibleTagSection>

      {showArtistTitleTagUi && (
        <Alert icon={<IconAlertTriangle />} color="orange" variant="light" mb="xs">
          <Group justify="space-between" align="flex-start" wrap="nowrap" gap="sm">
            <Text size="sm" style={{ flex: 1 }}>
              Tags should not repeat the artist, title, or source (
              {artistTitleTagOccurrences.map(({ tag }) => tag).join(', ')}).
            </Text>
            <Group gap={6} wrap="nowrap">
              <Button variant="subtle" color="orange" size="compact-sm" onClick={removeArtistTitleTagMatches}>
                Remove tags
              </Button>
              <Button variant="subtle" color="orange" size="compact-sm" onClick={ignoreArtistTitleTags}>
                Ignore
              </Button>
            </Group>
          </Group>
        </Alert>
      )}

      <Textarea
        value={tags}
        onChange={(e) => onChange(e.currentTarget.value)}
        minRows={3}
        autosize
      />

      {showDuplicateUi && (
        <Box mt="xs">
          <UnstyledButton
            onClick={() => setDuplicatesOpen((open) => !open)}
            style={{ width: '100%', textAlign: 'left' }}
          >
            <Alert icon={<IconAlertTriangle />} color="red" variant="light" style={{ cursor: 'pointer' }}>
              <Group justify="space-between" align="flex-start" wrap="nowrap" gap="sm">
                <Group gap={6} wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                  {duplicatesOpen ? (
                    <IconChevronDown size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                  ) : (
                    <IconChevronRight size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                  )}
                  <Text size="sm" style={{ flex: 1 }}>
                    {duplicatesOpen
                      ? 'Click × on a duplicate to remove it, or ignore if intentional.'
                      : 'There are duplicated tags. Click to review and remove them.'}
                  </Text>
                </Group>
                <Button
                  variant="subtle"
                  color="red"
                  size="compact-sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    ignoreDuplicates()
                  }}
                >
                  Ignore
                </Button>
              </Group>
            </Alert>
          </UnstyledButton>

          <Collapse in={duplicatesOpen}>
            <Group gap={6} mt="xs">
              {duplicateOccurrences.map(({ tag, index }) => (
                <Badge
                  key={`${tag}-${index}`}
                  variant="light"
                  color="red"
                  pr={3}
                  rightSection={
                    <ActionIcon
                      size="xs"
                      color="red"
                      variant="transparent"
                      aria-label={`Remove duplicate tag ${tag}`}
                      onClick={() => onChange(removeTagAtIndex(tags, index))}
                    >
                      <IconX size={12} />
                    </ActionIcon>
                  }
                >
                  {tag}
                </Badge>
              ))}
            </Group>
          </Collapse>
        </Box>
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
