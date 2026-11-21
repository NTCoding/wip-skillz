import { type Token } from 'markdown-it'
import { namedBlockType, pageMarkdownParser } from './page-markdown-parser'
import { sourceLinesOf, type SourceLines } from './source-lines'

export interface PageBlock extends SourceLines {
  readonly text: string
}

const blockTextTypes = new Set(['fence', 'code_block', namedBlockType])

export function normalisedText(text: string): string {
  return text.replaceAll(/\s+/g, ' ').trim()
}

export function pageBlocksOf(markdown: string): readonly PageBlock[] {
  const lines = markdown.split('\n')
  const tokens = pageMarkdownParser.parse(markdown, {})
  return tokens.flatMap((token, index) => {
    if (token.level !== 0 || token.map === null) {
      return []
    }
    const end =
      token.nesting === 1
        ? tokens.findIndex((closing, at) => at > index && closing.level === 0)
        : index
    const text = tokens
      .slice(index, end + 1)
      .flatMap((part) => part.children ?? [part])
      .map(textOf)
      .join('')
    return [{ ...sourceLinesOf(token.map, lines), text: normalisedText(text) }]
  })
}

function textOf(token: Token): string {
  if (token.type === 'text' || token.type === 'code_inline' || blockTextTypes.has(token.type)) {
    return token.content
  }
  return token.block || token.type === 'softbreak' || token.type === 'hardbreak' ? ' ' : ''
}
