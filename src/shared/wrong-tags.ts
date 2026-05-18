import type { TagHintContext } from './tag-hints'
import { removeTagByValue, tagListIncludes } from './tags'

export interface WrongTagSuggestion {
  id: string
  tag: string
  reason: string
}

function buildSearchText(ctx: TagHintContext): string {
  return [ctx.titleUnicode, ctx.title, ctx.folderName, ctx.source].filter(Boolean).join(' ')
}

function looksLikeGameTrack(text: string): boolean {
  return (
    /\(.*?game\s*ver\.?\s*\)/i.test(text) ||
    /\(.*?game\s*version\s*\)/i.test(text) ||
    /\bgame\s*ver\.?\b/i.test(text) ||
    /\b(video\s*game|videogame|ゲーム|vgm)\b/i.test(text) ||
    /\b(nintendo|playstation|xbox|steam|arcade)\b/i.test(text)
  )
}

function looksLikeAnimeTrack(text: string): boolean {
  return (
    /\(.*?tv\s*size.*?\)/i.test(text) ||
    /\btv\s*size\b/i.test(text) ||
    /\(.*?movie\s*size.*?\)/i.test(text) ||
    /\b(tvアニメ|tv anime|テレビアニメ)\b/i.test(text)
  )
}

export function getWrongTagSuggestions(
  tags: string,
  ctx: TagHintContext,
  dismissedRuleIds: string[]
): WrongTagSuggestion[] {
  const text = buildSearchText(ctx)
  const dismissed = new Set(dismissedRuleIds)
  const suggestions: WrongTagSuggestion[] = []

  if (
    looksLikeGameTrack(text) &&
    !looksLikeAnimeTrack(text) &&
    !dismissed.has('anime-on-game')
  ) {
    if (tagListIncludes(tags, 'anime')) {
      suggestions.push({
        id: 'anime-on-game',
        tag: 'anime',
        reason: 'This looks like a video game track; anime tags may be incorrect.'
      })
    }
    if (tagListIncludes(tags, 'アニメ')) {
      suggestions.push({
        id: 'anime-on-game-kana',
        tag: 'アニメ',
        reason: 'This looks like a video game track; anime tags may be incorrect.'
      })
    }
  }

  if (
    looksLikeAnimeTrack(text) &&
    !looksLikeGameTrack(text) &&
    !dismissed.has('vgm-on-anime')
  ) {
    for (const tag of ['videogame', 'vgm', 'bgm']) {
      if (tagListIncludes(tags, tag)) {
        suggestions.push({
          id: `vgm-on-anime-${tag}`,
          tag,
          reason: 'This looks like an anime track; video game tags may be incorrect.'
        })
      }
    }
  }

  return suggestions.filter((entry) => !dismissed.has(entry.id))
}

export { removeTagByValue }
