import { tagListIncludes } from './tags'

export interface TagHintContext {
  titleUnicode: string
  title: string
  folderName: string
  source: string
}

interface TagHintRule {
  id: string
  reason: string
  test: (text: string) => boolean
  tags: string[]
}

function buildSearchText(ctx: TagHintContext): string {
  return [ctx.titleUnicode, ctx.title, ctx.folderName, ctx.source].filter(Boolean).join(' ')
}

const TAG_HINT_RULES: TagHintRule[] = [
  {
    id: 'tv-size',
    reason: 'TV Size in title or folder',
    test: (text) =>
      /\(.*?tv\s*size.*?\)/i.test(text) ||
      /\btv\s*size\b/i.test(text) ||
      /\[.*?tv\s*size.*?\]/i.test(text),
    tags: ['anime', 'アニメ']
  },
  {
    id: 'movie-size',
    reason: 'Movie Size in title or folder',
    test: (text) => /\(.*?movie\s*size.*?\)/i.test(text) || /\bmovie\s*size\b/i.test(text),
    tags: ['anime', 'アニメ']
  },
  {
    id: 'game-ver',
    reason: 'Game version in title or folder',
    test: (text) =>
      /\(.*?game\s*ver\.?\s*\)/i.test(text) ||
      /\(.*?game\s*version\s*\)/i.test(text) ||
      /\bgame\s*ver\.?\b/i.test(text) ||
      /\bgame\s*version\b/i.test(text),
    tags: ['videogame', 'ost', 'vgm', 'bgm']
  },
  {
    id: 'source-anime',
    reason: 'Anime-related source',
    test: (text) =>
      /\b(tvアニメ|tv anime|anime|アニメ|テレビアニメ)\b/i.test(text) &&
      !/\bvideo\s*game\b/i.test(text),
    tags: ['anime', 'アニメ']
  },
  {
    id: 'source-videogame',
    reason: 'Video game source',
    test: (text) =>
      /\b(video\s*game|videogame|ゲーム|game\s*ost|vgm)\b/i.test(text) ||
      /\b(nintendo|playstation|xbox|steam|arcade)\b/i.test(text),
    tags: ['videogame', 'ost', 'vgm', 'bgm']
  }
]

export interface TagHintSuggestion {
  tag: string
  reason: string
}

export function getTagHintSuggestions(tags: string, ctx: TagHintContext): TagHintSuggestion[] {
  const text = buildSearchText(ctx)
  const seen = new Set<string>()
  const suggestions: TagHintSuggestion[] = []

  for (const rule of TAG_HINT_RULES) {
    if (!rule.test(text)) continue

    for (const tag of rule.tags) {
      const key = tag.toLowerCase()
      if (seen.has(key) || tagListIncludes(tags, tag)) continue
      seen.add(key)
      suggestions.push({ tag, reason: rule.reason })
    }
  }

  return suggestions
}

export function getSuggestedPatternTags(tags: string, ctx: TagHintContext): string[] {
  return getTagHintSuggestions(tags, ctx).map((entry) => entry.tag)
}

export function hasMatchableTagHints(ctx: TagHintContext): boolean {
  const text = buildSearchText(ctx)
  return TAG_HINT_RULES.some((rule) => rule.test(text))
}
