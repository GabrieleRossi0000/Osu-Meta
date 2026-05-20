import { ActionIcon, Box, Button, Group, Paper, Popover, Stack, Text, TextInput } from '@mantine/core'
import { IconColorPicker, IconPlus, IconTrash } from '@tabler/icons-react'
import { useState } from 'react'
import { HexColorPicker } from 'react-colorful'
import type { BeatmapComboColour } from '@shared/types'
import {
  beatmapComboColourFromRgb,
  parseHexColor,
  parseOsuRgbValue,
  rgbTupleToHex
} from '@shared/combo-colours'

interface ComboColoursEditorProps {
  colours: BeatmapComboColour[]
  onChange: (next: BeatmapComboColour[]) => void
}

function updateAt(
  colours: BeatmapComboColour[],
  index: number,
  colour: BeatmapComboColour
): BeatmapComboColour[] {
  const next = [...colours]
  next[index] = colour
  return next
}

export default function ComboColoursEditor({ colours, onChange }: ComboColoursEditorProps): JSX.Element {
  const [openPickerFor, setOpenPickerFor] = useState<number | null>(null)

  const addColour = (): void => {
    onChange([...colours, beatmapComboColourFromRgb(255, 100, 160)])
  }

  const removeAt = (index: number): void => {
    onChange(colours.filter((_, i) => i !== index))
  }

  return (
    <Stack gap="sm">
      <Text size="xs" c="dimmed">
        Change the combo colours for this mapset here.
      </Text>
      {colours.length === 0 ? (
        <Paper
          p="sm"
          radius="md"
          bg="rgba(255,255,255,0.02)"
          style={{ border: '1px dashed rgba(255,255,255,0.15)' }}
        >
          <Text size="sm" c="dimmed">
            No combo colours yet.
          </Text>
        </Paper>
      ) : (
        colours.map((c, index) => (
          <Paper
            key={index}
            p="sm"
            radius="md"
            bg="rgba(255,255,255,0.02)"
            style={{
              border: '1px solid rgba(255,255,255,0.08)',
              transition: 'transform 140ms ease, border-color 140ms ease'
            }}
          >
            <Group align="flex-end" wrap="nowrap" gap="sm">
              <Group gap={10} w={108} style={{ flexShrink: 0 }}>
                <Popover
                  opened={openPickerFor === index}
                  onChange={(opened) => setOpenPickerFor(opened ? index : null)}
                  position="bottom-start"
                  withArrow
                  shadow="md"
                >
                  <Popover.Target>
                    <Box
                      component="button"
                      type="button"
                      className="mv-combo-swatch-shell"
                      aria-label={`Open color picker for combo ${index + 1}`}
                      onClick={() =>
                        setOpenPickerFor((current) => (current === index ? null : index))
                      }
                      style={{
                        flexShrink: 0,
                        position: 'relative',
                        width: 54,
                        height: 28,
                        borderRadius: 999,
                        border: '1px solid rgba(255,255,255,0.16)',
                        backgroundColor: rgbTupleToHex(c),
                        boxShadow: '0 6px 16px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.12)',
                        cursor: 'pointer'
                      }}
                    >
                      <IconColorPicker
                        size={12}
                        stroke={2.4}
                        aria-hidden
                        style={{
                          position: 'absolute',
                          right: 7,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: 'rgba(255,255,255,0.9)',
                          filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.45))',
                          pointerEvents: 'none'
                        }}
                      />
                    </Box>
                  </Popover.Target>
                  <Popover.Dropdown p="xs" bg="dark.6" className="mv-combo-picker-popover">
                    <HexColorPicker
                      color={rgbTupleToHex(c)}
                      onChange={(hex) => {
                        const parsed = parseHexColor(hex)
                        if (parsed) onChange(updateAt(colours, index, parsed))
                      }}
                    />
                  </Popover.Dropdown>
                </Popover>
                <Text size="sm" fw={500}>
                  Combo {index + 1}
                </Text>
              </Group>

              <TextInput
                label="Hex"
                size="xs"
                w={120}
                value={rgbTupleToHex(c)}
                onChange={(e) => {
                  const parsed = parseHexColor(e.currentTarget.value)
                  if (parsed) onChange(updateAt(colours, index, parsed))
                }}
                placeholder="#RRGGBB"
                styles={{ input: { fontFamily: 'monospace' } }}
              />

              <TextInput
                label="RGB"
                size="xs"
                style={{ flex: 1, minWidth: 0 }}
                value={`${c.r}, ${c.g}, ${c.b}`}
                onChange={(e) => {
                  const parsed = parseOsuRgbValue(e.currentTarget.value)
                  if (parsed) onChange(updateAt(colours, index, parsed))
                }}
                placeholder="R, G, B"
                styles={{ input: { fontFamily: 'monospace' } }}
              />

              <ActionIcon
                variant="subtle"
                color="red"
                aria-label={`Remove combo colour ${index + 1}`}
                onClick={() => removeAt(index)}
                mb={4}
              >
                <IconTrash size={18} />
              </ActionIcon>
            </Group>
          </Paper>
        ))
      )}

      <Button variant="light" size="xs" leftSection={<IconPlus size={16} />} onClick={addColour}>
        Add combo colour
      </Button>
    </Stack>
  )
}
