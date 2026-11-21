import { type Token } from 'markdown-it'
import { headingIdOf } from '../slug'

export interface Heading {
  readonly level: number
  readonly text: string
  readonly id: string
  readonly line: number
}

interface HeadingDraft {
  readonly token: Token
  readonly level: number
  readonly line: number
  readonly text: string
}

interface HeadingScan {
  readonly line: number
  readonly open: HeadingDraft | undefined
  readonly drafts: readonly HeadingDraft[]
}

export function addHeadingIds(tokens: readonly Token[]): Heading[] {
  const start: HeadingScan = { line: 1, open: undefined, drafts: [] }
  const { drafts } = withChildren(tokens).reduce(scanHeading, start)
  return drafts.reduce<Heading[]>((headings, draft) => {
    const id = uniqueId(headingIdOf(draft.text) || 'section', headings)
    draft.token.attrSet('id', id)
    return [...headings, { level: draft.level, text: draft.text, id, line: draft.line }]
  }, [])
}

export function withChildren(tokens: readonly Token[]): Token[] {
  return tokens.flatMap((token) => [token, ...(token.children ?? [])])
}

function scanHeading(scan: HeadingScan, token: Token): HeadingScan {
  const line = token.map === null ? scan.line : token.map[0] + 1
  if (token.type === 'heading_open') {
    const open = { token, level: Number(token.tag.slice(1)), line, text: '' }
    return { line, open, drafts: scan.drafts }
  }
  if (scan.open === undefined) {
    return { ...scan, line }
  }
  if (token.type === 'heading_close') {
    return {
      line,
      open: undefined,
      drafts: [...scan.drafts, { ...scan.open, text: scan.open.text.trim() }],
    }
  }
  return { ...scan, line, open: { ...scan.open, text: scan.open.text + plainText(token) } }
}

export function plainText(token: Token): string {
  if (token.type === 'text' || token.type === 'code_inline') {
    return token.content
  }
  return token.type === 'softbreak' || token.type === 'hardbreak' ? ' ' : ''
}

function uniqueId(base: string, headings: readonly Heading[], number = 1): string {
  const id = number === 1 ? base : `${base}-${number}`
  return headings.some((heading) => heading.id === id) ? uniqueId(base, headings, number + 1) : id
}
