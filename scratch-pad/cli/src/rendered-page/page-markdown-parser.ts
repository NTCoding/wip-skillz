import MarkdownIt, { type StateBlock, type Token } from 'markdown-it'

export const namedBlockType = 'named_block'
const blockFence = ':::'

export const pageMarkdownParser = pageParser()

// The body of a named block can't contain another named block, because the first ::: line
// closes the block. So a ::: line in the body is rendered as text rather than lost.
export const blockBodyParser = pageParser().disable(namedBlockType)

function pageParser(): MarkdownIt {
  const parser = new MarkdownIt({ html: false })
  parser.block.ruler.before('fence', namedBlockType, namedBlockRule, {
    alt: ['paragraph', 'reference', 'blockquote', 'list'],
  })
  parser.renderer.rules.fence = (tokens, index) =>
    tokens
      .slice(index, index + 1)
      .map((token) => fenceHtml(parser, token))
      .join('')
  return parser
}

function namedBlockRule(
  state: StateBlock,
  startLine: number,
  endLine: number,
  silent: boolean,
): boolean {
  const opening = blockLine(state, startLine).trim()
  const words = opening.startsWith(blockFence) ? opening.slice(blockFence.length).trim() : ''
  if (words === '') {
    return false
  }
  if (silent) {
    return true
  }
  const closing = closingLine(state, startLine + 1, endLine)
  const end = closing === undefined ? endLine : closing + 1
  const token = state.push(namedBlockType, 'div', 0)
  token.block = true
  token.info = words
  token.content = state.getLines(startLine + 1, closing ?? endLine, state.blkIndent, true)
  token.markup = closing === undefined ? '' : blockFence
  token.map = [startLine, end]
  state.line = end
  return true
}

function closingLine(state: StateBlock, from: number, endLine: number): number | undefined {
  return Array.from({ length: endLine - from }, (_, offset) => from + offset).find(
    (line) => blockLine(state, line).trim() === blockFence,
  )
}

function blockLine(state: StateBlock, line: number): string {
  return state.getLines(line, line + 1, state.blkIndent, false)
}

function fenceHtml(parser: MarkdownIt, token: Token): string {
  const language = firstWordOf(parser.utils.unescapeAll(token.info).trim())
  const languageClass =
    language === '' ? '' : ` class="language-${parser.utils.escapeHtml(language)}"`
  const code = parser.utils.escapeHtml(token.content)
  return `<pre${parser.renderer.renderAttrs(token)}><code${languageClass}>${code}</code></pre>\n`
}

export function firstWordOf(text: string): string {
  const spaceAt = text.search(/\s/)
  return spaceAt === -1 ? text : text.slice(0, spaceAt)
}
