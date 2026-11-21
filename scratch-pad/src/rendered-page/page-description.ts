import { type Token } from 'markdown-it'
import { plainText } from './page-headings'
import { pageMarkdownParser } from './page-markdown-parser'

const firstSentencePattern = /^.*?[.!?](?=\s|$)/

export function pageDescription(markdown: string): string | undefined {
  const tokens = pageMarkdownParser.parse(markdown, {})
  const titleAt = tokens.findIndex((token) => token.type === 'heading_open' && token.tag === 'h1')
  const paragraphAt = tokens.findIndex(
    (token, index) => index > titleAt && token.type === 'paragraph_open' && token.level === 0,
  )
  const text = paragraphText(paragraphAt === -1 ? undefined : tokens[paragraphAt + 1])
  return text === '' ? undefined : (firstSentencePattern.exec(text)?.[0] ?? text)
}

function paragraphText(inline: Token | undefined): string {
  return (inline?.children ?? []).map(plainText).join('').replaceAll(/\s+/g, ' ').trim()
}
