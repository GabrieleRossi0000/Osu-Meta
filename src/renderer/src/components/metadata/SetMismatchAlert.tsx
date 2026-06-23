import {
  Alert,
  Box,
  Collapse,
  Group,
  ScrollArea,
  Stack,
  Text,
  Tooltip,
  UnstyledButton
} from '@mantine/core'
import {
  IconAlertTriangle,
  IconCheck,
  IconChevronRight,
  IconX
} from '@tabler/icons-react'
import { rgbTupleToHex } from '@shared/combo-colours'
import {
  formatDifficultyList,
  groupMetadataEntriesByValue
} from '@shared/metadata-mismatch'
import type {
  BeatmapComboColour,
  ComboColourMismatchGroup,
  MetadataFieldMismatchDetail
} from '@shared/types'
import { useState } from 'react'

interface SetMismatchAlertProps {
  hasMetadataMismatch: boolean
  hasComboMismatch: boolean
  metadataMismatchDetails: MetadataFieldMismatchDetail[]
  comboColourMismatchDetails: ComboColourMismatchGroup[]
}

function MatchIndicator({ matching }: { matching: boolean }): JSX.Element {
  return matching ? (
    <IconCheck size={14} color="var(--mantine-color-teal-5)" stroke={2.5} />
  ) : (
    <IconX size={14} color="var(--mantine-color-red-5)" stroke={2.5} />
  )
}

function CompactComboSwatches({ colours }: { colours: BeatmapComboColour[] }): JSX.Element {
  if (colours.length === 0) {
    return (
      <Text size="xs" className="mv-mismatch-diff-value">
        (none)
      </Text>
    )
  }

  return (
    <Group gap={4} wrap="nowrap">
      {colours.map((colour, index) => {
        const hex = rgbTupleToHex(colour)
        return (
          <Tooltip key={`${index}-${hex}`} label={`${index + 1}: ${hex} · ${colour.r}, ${colour.g}, ${colour.b}`}>
            <Box className="mv-mismatch-combo-swatch mv-mismatch-combo-swatch--compact" style={{ backgroundColor: hex }} />
          </Tooltip>
        )
      })}
    </Group>
  )
}

export default function SetMismatchAlert({
  hasMetadataMismatch,
  hasComboMismatch,
  metadataMismatchDetails,
  comboColourMismatchDetails
}: SetMismatchAlertProps): JSX.Element {
  const [open, setOpen] = useState(false)

  return (
    <Alert
      className="mv-alert-enter mv-mismatch-alert"
      icon={<IconAlertTriangle />}
      color="yellow"
      variant="light"
    >
      <Stack gap="xs">
        <Text size="sm">
          Metadata and combo colours have different values between difficulties. Saving will unify
          all .osu files in this set.
        </Text>

        <UnstyledButton
          className={`mv-mismatch-alert-toggle mv-chevron-btn${open ? ' mv-chevron-btn--open' : ''}`}
          onClick={() => setOpen((value) => !value)}
        >
          <Group gap={6} wrap="nowrap">
            <IconChevronRight size={14} stroke={2.5} className="mv-chevron-icon" />
            <Text size="sm" fw={500}>
              {open ? 'Hide details' : 'Show details'}
            </Text>
          </Group>
        </UnstyledButton>

        <Collapse in={open}>
          <ScrollArea.Autosize mah={280} type="auto" className="mv-mismatch-scroll">
            <Stack gap="sm" className="mv-mismatch-alert-details">
              {hasMetadataMismatch ? (
                <Box className="mv-mismatch-alert-panel">
                  <Text size="xs" fw={600} className="mv-mismatch-alert-kicker" mb={6}>
                    Metadata differences
                  </Text>
                  <Stack gap="xs">
                    {metadataMismatchDetails.map((detail) => (
                      <Box key={detail.field} className="mv-mismatch-field-block">
                        <Text size="xs" fw={600} className="mv-mismatch-field-label" mb={4}>
                          {detail.label}
                        </Text>
                        <Stack gap={2}>
                          {groupMetadataEntriesByValue(detail.entries).map((group) => (
                            <Group
                              key={`${detail.field}-${group.value}`}
                              gap={6}
                              wrap="nowrap"
                              align="flex-start"
                              className={`mv-mismatch-value-row mv-mismatch-value-row--compact${group.matching ? ' mv-mismatch-value-row--match' : ' mv-mismatch-value-row--mismatch'}`}
                            >
                              <Box style={{ flexShrink: 0, marginTop: 1 }}>
                                <MatchIndicator matching={group.matching} />
                              </Box>
                              <Tooltip
                                label={group.value}
                                multiline
                                w={320}
                                disabled={group.value.length < 48}
                              >
                                <Text size="xs" className="mv-mismatch-diff-value mv-mismatch-diff-value--compact" lineClamp={1} style={{ flex: 1, minWidth: 0 }}>
                                  {group.value}
                                </Text>
                              </Tooltip>
                              <Text size="xs" className="mv-mismatch-diff-name" style={{ flexShrink: 0, maxWidth: '42%' }} lineClamp={1}>
                                {formatDifficultyList(group.difficulties)}
                              </Text>
                            </Group>
                          ))}
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              ) : null}

              {hasComboMismatch ? (
                <Box className="mv-mismatch-alert-panel">
                  <Text size="xs" fw={600} className="mv-mismatch-alert-kicker" mb={6}>
                    Combo colour palettes
                  </Text>
                  <Stack gap={2}>
                    {comboColourMismatchDetails.map((group) => {
                      const matching = group.entries.length >= 2
                      return (
                        <Group
                          key={group.summary}
                          gap={6}
                          wrap="nowrap"
                          align="center"
                          className={`mv-mismatch-value-row mv-mismatch-value-row--compact${matching ? ' mv-mismatch-value-row--match' : ' mv-mismatch-value-row--mismatch'}`}
                        >
                          <Box style={{ flexShrink: 0 }}>
                            <MatchIndicator matching={matching} />
                          </Box>
                          <CompactComboSwatches colours={group.comboColours} />
                          <Text size="xs" className="mv-mismatch-diff-name" style={{ flex: 1, minWidth: 0 }} lineClamp={1}>
                            {formatDifficultyList(group.entries)}
                          </Text>
                        </Group>
                      )
                    })}
                  </Stack>
                </Box>
              ) : null}
            </Stack>
          </ScrollArea.Autosize>
        </Collapse>
      </Stack>
    </Alert>
  )
}
