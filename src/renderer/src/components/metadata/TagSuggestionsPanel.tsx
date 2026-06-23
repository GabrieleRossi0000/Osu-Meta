import {
  Badge,
  Box,
  Collapse,
  Group,
  Loader,
  Tabs,
  Text,
  UnstyledButton
} from '@mantine/core'
import { IconChevronRight, IconCircleCheck } from '@tabler/icons-react'
import type { TagSectionsExpanded } from '@shared/types'
import { useEffect, useMemo, useRef, type ReactNode } from 'react'

export interface TagSuggestionCategory {
  key: keyof TagSectionsExpanded
  label: string
  description: string
  suggestionCount: number
  loading?: boolean
  visible: boolean
  chipColor?: string
  content: ReactNode
}

interface TagSuggestionsPanelProps {
  categories: TagSuggestionCategory[]
  panelOpen: boolean
  onPanelOpenChange: (open: boolean) => void
  activeKey: keyof TagSectionsExpanded
  onActiveKeyChange: (key: keyof TagSectionsExpanded) => void
}

export default function TagSuggestionsPanel({
  categories,
  panelOpen,
  onPanelOpenChange,
  activeKey,
  onActiveKeyChange
}: TagSuggestionsPanelProps): JSX.Element | null {
  const visibleCategories = useMemo(
    () => categories.filter((category) => category.visible),
    [categories]
  )

  const totalToAdd = useMemo(
    () => visibleCategories.reduce((sum, category) => sum + category.suggestionCount, 0),
    [visibleCategories]
  )

  const anyLoading = visibleCategories.some((category) => category.loading)

  const previousTotalRef = useRef(totalToAdd)
  useEffect(() => {
    if (previousTotalRef.current === 0 && totalToAdd > 0 && !panelOpen) {
      onPanelOpenChange(true)
    }
    previousTotalRef.current = totalToAdd
  }, [totalToAdd, panelOpen, onPanelOpenChange])

  useEffect(() => {
    if (visibleCategories.length === 0) return
    const active = visibleCategories.find((category) => category.key === activeKey)
    if (active) return

    const preferred =
      visibleCategories.find((category) => category.suggestionCount > 0) ??
      visibleCategories.find((category) => category.loading) ??
      visibleCategories[0]

    if (preferred) onActiveKeyChange(preferred.key)
  }, [visibleCategories, activeKey, onActiveKeyChange])

  if (visibleCategories.length === 0) return null

  const activeCategory =
    visibleCategories.find((category) => category.key === activeKey) ?? visibleCategories[0]

  return (
    <Box className={`mv-tag-suggestions-panel${panelOpen ? ' mv-tag-suggestions-panel--open' : ''}`}>
      <UnstyledButton
        className={`mv-tag-suggestions-panel-header mv-chevron-btn${panelOpen ? ' mv-chevron-btn--open' : ''}`}
        onClick={() => onPanelOpenChange(!panelOpen)}
      >
        <Group justify="space-between" wrap="nowrap" gap="sm" w="100%">
          <Group gap={8} wrap="nowrap">
            <IconChevronRight size={15} stroke={2.5} className="mv-chevron-icon" />
            <Text size="sm" fw={500} className="mv-tag-section-label">
              Suggested tags
            </Text>
          </Group>
          {anyLoading ? (
            <Group gap={6} wrap="nowrap" className="mv-tag-section-status-pill mv-tag-section-status-pill--loading">
              <Loader size={14} color="blue" />
              <Text size="xs" component="span">
                Checking
              </Text>
            </Group>
          ) : totalToAdd > 0 ? (
            <Badge variant="light" color="blue" size="sm" className="mv-tag-section-count">
              {totalToAdd} to add
            </Badge>
          ) : (
            <Badge
              variant="light"
              color="teal"
              size="sm"
              leftSection={<IconCircleCheck size={12} stroke={2.25} />}
              className="mv-tag-section-done"
            >
              Done
            </Badge>
          )}
        </Group>
      </UnstyledButton>

      <Collapse in={panelOpen} transitionDuration={200}>
        <Box className="mv-tag-suggestions-panel-body">
          <Text size="xs" className="mv-tag-suggestions-hint" mb="xs">
            Choose a category, then click a tag to add it.
          </Text>

          <Tabs
            value={activeCategory.key}
            onChange={(value) => {
              if (value) onActiveKeyChange(value as keyof TagSectionsExpanded)
            }}
            variant="pills"
            radius="md"
            className="mv-tag-suggestions-tabs-root"
          >
            <Tabs.List className="mv-tag-suggestions-tabs-list" grow>
              {visibleCategories.map((category) => {
                const chipCount = category.suggestionCount
                return (
                  <Tabs.Tab
                    key={category.key}
                    value={category.key}
                    className="mv-tag-suggestions-tab"
                    rightSection={
                      category.loading ? (
                        <Loader size={12} color="blue" />
                      ) : chipCount > 0 ? (
                        <Badge
                          size="xs"
                          variant="filled"
                          color={category.chipColor ?? 'blue'}
                          circle
                          className="mv-tag-suggestions-tab-count"
                        >
                          {chipCount}
                        </Badge>
                      ) : (
                        <IconCircleCheck
                          size={12}
                          color="var(--mantine-color-teal-5)"
                          stroke={2.25}
                        />
                      )
                    }
                  >
                    {category.label}
                  </Tabs.Tab>
                )
              })}
            </Tabs.List>

            {visibleCategories.map((category) => (
              <Tabs.Panel key={category.key} value={category.key} pt="sm">
                <Text size="xs" className="mv-tag-suggestions-category-desc" mb="xs">
                  {category.description}
                </Text>
                <Box className="mv-tag-suggestions-content-box">
                  {category.loading && category.suggestionCount === 0 ? (
                    <Group gap={8} wrap="nowrap">
                      <Loader size={16} color="blue" />
                      <Text size="sm" className="mv-tag-section-status-text">
                        Checking osu!…
                      </Text>
                    </Group>
                  ) : category.suggestionCount > 0 ? (
                    <Group gap={8} className="mv-tag-suggestions-pills">
                      {category.content}
                    </Group>
                  ) : (
                    <Group gap={8} wrap="nowrap">
                      <IconCircleCheck size={16} className="mv-tag-section-status-icon" />
                      <Text size="sm" className="mv-tag-section-status-text">
                        Nothing to add in this category.
                      </Text>
                    </Group>
                  )}
                </Box>
              </Tabs.Panel>
            ))}
          </Tabs>
        </Box>
      </Collapse>
    </Box>
  )
}
