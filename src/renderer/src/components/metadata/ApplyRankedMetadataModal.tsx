import {
  Button,
  Group,
  Modal,
  Radio,
  ScrollArea,
  Stack,
  Table,
  Text,
  Tooltip
} from '@mantine/core'
import { useEffect, useMemo, useState } from 'react'
import {
  applyRankedMetadataFields,
  buildRankedMetadataApplyFields,
  buildRankedMetadataSuggestion,
  type RankedMetadataApplyField,
  type RankedMetadataApplyMode
} from '@shared/ranked-metadata-apply'
import type { BeatmapMetadata, RankedMetadataMatch } from '@shared/types'
import { modalClassNames, modalOverlayProps, modalTransitionProps } from '../../theme/modal'

const appModalProps = {
  centered: true,
  classNames: modalClassNames,
  overlayProps: modalOverlayProps,
  transitionProps: modalTransitionProps
} as const

interface ApplyRankedMetadataModalProps {
  opened: boolean
  onClose: () => void
  metadata: BeatmapMetadata
  match: RankedMetadataMatch
  beatmapSetId: number | null
  isOnOsuWebsite: boolean
  onApply: (metadata: BeatmapMetadata) => void
}

export default function ApplyRankedMetadataModal({
  opened,
  onClose,
  metadata,
  match,
  beatmapSetId,
  isOnOsuWebsite,
  onApply
}: ApplyRankedMetadataModalProps): JSX.Element {
  const [mode, setMode] = useState<RankedMetadataApplyMode>('fillEmpty')
  const [rankedTags, setRankedTags] = useState('')
  const [loadingTags, setLoadingTags] = useState(false)
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!opened) return

    setMode('fillEmpty')
    setRankedTags('')
    setLoadingTags(true)

    void window.api
      .suggestRankedGenreLanguage({
        artistUnicode: metadata.artistUnicode,
        artist: metadata.artist,
        titleUnicode: metadata.titleUnicode,
        title: metadata.title,
        beatmapSetId: isOnOsuWebsite ? beatmapSetId : null
      })
      .then((result) => {
        setRankedTags(result.kind === 'found' ? result.suggestion.rankedTags : '')
      })
      .finally(() => setLoadingTags(false))
  }, [
    opened,
    metadata.artistUnicode,
    metadata.artist,
    metadata.titleUnicode,
    metadata.title,
    beatmapSetId,
    isOnOsuWebsite
  ])

  const suggested = useMemo(
    () => buildRankedMetadataSuggestion(match, rankedTags),
    [match, rankedTags]
  )

  const fields = useMemo(
    () => buildRankedMetadataApplyFields(metadata, suggested, mode),
    [metadata, suggested, mode]
  )

  useEffect(() => {
    if (!opened) return
    setSelectedKeys(new Set(fields.map((field) => field.key)))
  }, [opened, fields])

  const toggleField = (key: string): void => {
    setSelectedKeys((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const selectedFields: RankedMetadataApplyField[] = fields.filter((field) =>
    selectedKeys.has(field.key)
  )

  const handleApply = (): void => {
    if (selectedFields.length === 0) {
      onClose()
      return
    }
    onApply(applyRankedMetadataFields(metadata, selectedFields))
    onClose()
  }

  return (
    <Modal
      {...appModalProps}
      opened={opened}
      onClose={onClose}
      title="Apply metadata from ranked reference"
      size="lg"
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Reference set #{match.beatmapSetId} · {match.artistUnicode || match.artist} -{' '}
          {match.titleUnicode || match.title}
        </Text>

        <Radio.Group
          label="Apply mode"
          value={mode}
          onChange={(value) => setMode(value as RankedMetadataApplyMode)}
        >
          <Stack gap={6} mt={6}>
            <Radio value="fillEmpty" label="Only fill empty fields" />
            <Radio value="overwriteMismatches" label="Overwrite fields that differ from reference" />
          </Stack>
        </Radio.Group>

        {loadingTags ? (
          <Text size="sm" c="dimmed">
            Loading ranked tags…
          </Text>
        ) : fields.length === 0 ? (
          <Text size="sm" c="dimmed">
            Nothing to apply with the current mode — your metadata already matches the reference.
          </Text>
        ) : (
          <ScrollArea.Autosize mah={320}>
            <Table striped highlightOnHover withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th w={36} />
                  <Table.Th>Field</Table.Th>
                  <Table.Th>Current</Table.Th>
                  <Table.Th>Reference</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {fields.map((field) => (
                  <Table.Tr
                    key={field.key}
                    style={{ cursor: 'pointer' }}
                    onClick={() => toggleField(field.key)}
                  >
                    <Table.Td>
                      <input
                        type="checkbox"
                        checked={selectedKeys.has(field.key)}
                        onChange={() => toggleField(field.key)}
                        onClick={(event) => event.stopPropagation()}
                      />
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" fw={500}>
                        {field.label}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed" lineClamp={2}>
                        {field.current.trim() || '(empty)'}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" lineClamp={2}>
                        {field.suggested}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea.Autosize>
        )}

        <Group justify="space-between">
          <Tooltip label="Open reference set on osu!">
            <Button
              variant="subtle"
              onClick={() => void window.api.openBeatmapPage(match.beatmapSetId)}
            >
              View #{match.beatmapSetId}
            </Button>
          </Tooltip>
          <Group gap="sm">
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleApply} disabled={selectedFields.length === 0}>
              Apply {selectedFields.length > 0 ? `(${selectedFields.length})` : ''}
            </Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  )
}
