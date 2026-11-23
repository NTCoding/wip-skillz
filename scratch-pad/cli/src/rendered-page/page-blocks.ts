import { type Token } from 'markdown-it'
import { isAgentNote } from './agent-note-block'
import { isDecision } from './decision-block'
import { blockBodyParser, namedBlockType, pageMarkdownParser } from './page-markdown-parser'
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
    const text = textOfTokens(tokens.slice(index, end + 1))
    return [{ ...sourceLinesOf(token.map, lines), text: normalisedText(text) }]
  })
}

function textOfTokens(tokens: readonly Token[]): string {
  return tokens
    .flatMap((part) => part.children ?? [part])
    .map(textOf)
    .join('')
}

// The body of an :::agent-note block and the body of a :::decision block are parsed as Markdown,
// because the browser shows the text of a link rather than its Markdown. A link in the context of a
// decision is an example.
function textOf(token: Token): string {
  if (isAgentNote(token) || isDecision(token)) {
    return textOfTokens(blockBodyParser.parse(token.content, {}))
  }
  if (token.type === 'text' || token.type === 'code_inline' || blockTextTypes.has(token.type)) {
    return token.content
  }
  return token.block || token.type === 'softbreak' || token.type === 'hardbreak' ? ' ' : ''
}
