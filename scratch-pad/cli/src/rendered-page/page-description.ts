import { type Token } from 'markdown-it'
import { plainText, withChildren } from './page-headings'
import { pageMarkdownParser } from './page-markdown-parser'

interface TextPiece {
  readonly text: string
  readonly canEndSentence: boolean
}

interface PieceScan {
  readonly linkDepth: number
  readonly pieces: readonly TextPiece[]
}

const sentenceEndPattern = /[.!?]/g

export function pageDescription(markdown: string): string | undefined {
  const tokens = pageMarkdownParser.parse(markdown, {})
  const titleEnd = tokens.findIndex((token) => token.type === 'heading_close' && token.tag === 'h1')
  const firstBlock = tokens[titleEnd + 1]
  const text =
    firstBlock?.type === 'paragraph_open'
      ? firstSentence(withChildren(tokens.slice(titleEnd + 2, titleEnd + 3)))
      : ''
  return text === '' ? undefined : text
}

function firstSentence(inlineTokens: readonly Token[]): string {
  const start: PieceScan = { linkDepth: 0, pieces: [] }
  const { pieces } = inlineTokens.reduce(scanPiece, start)
  const text = pieces.map((piece) => piece.text).join('')
  const end = sentenceEnds(pieces).find((at) => /^\s?$/.test(text.charAt(at + 1)))
  return (end === undefined ? text : text.slice(0, end + 1)).replaceAll(/\s+/g, ' ').trim()
}

function scanPiece(scan: PieceScan, token: Token): PieceScan {
  const linkDepth =
    scan.linkDepth + (token.type === 'link_open' ? 1 : 0) - (token.type === 'link_close' ? 1 : 0)
  const canEndSentence = token.type === 'text' && scan.linkDepth === 0
  return { linkDepth, pieces: [...scan.pieces, { text: plainText(token), canEndSentence }] }
}

function sentenceEnds(pieces: readonly TextPiece[]): number[] {
  return pieces.flatMap((piece, index) => {
    const start = pieces.slice(0, index).reduce((length, each) => length + each.text.length, 0)
    return piece.canEndSentence
      ? [...piece.text.matchAll(sentenceEndPattern)].map((match) => start + match.index)
      : []
  })
}
