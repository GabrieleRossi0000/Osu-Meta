import { isFaMissingGuildTags } from '../shared/featured-artist'
import { metadataEquals } from '../shared/metadata-utils'
import { hasDuplicateTags } from '../shared/tags'
import type { BeatmapSetFlags } from '../shared/types'
import { readMetadataFromFile } from './osu-file'

export function computeSetFlags(osuFiles: string[]): BeatmapSetFlags {
  if (osuFiles.length === 0) {
    return {
      needsTags: true,
      hasDuplicates: false,
      mismatchedMetadata: false,
      faMissingGuild: false
    }
  }

  const metadatas = osuFiles.map((filePath) => readMetadataFromFile(filePath))
  const primary = metadatas[0]
  const mismatched = !metadatas.every((meta) => metadataEquals(primary, meta))

  return {
    needsTags: !primary.tags.trim(),
    hasDuplicates: hasDuplicateTags(primary.tags),
    mismatchedMetadata: mismatched,
    faMissingGuild: isFaMissingGuildTags(primary.tags)
  }
}
