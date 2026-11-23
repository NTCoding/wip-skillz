import { type Token } from 'markdown-it'
import { plainText, withChildren } from './page-headings'
import { pageLink } from './page-links'
import { blockBodyParser } from './page-markdown-parser'
import { normalisedText } from './page-blocks'

// A link in the context of a decision to a page of the scratch pad or to one of its sections
interface ContextLink {
  readonly text: string
  readonly page: string
  readonly headingId: string | undefined
}

// The Inbox shows the first paragraph of a decision's context, which is undefined if the context
// starts with a list. It also shows the links to the pages of the scratch pad in the order that
// the agent wrote them, which is the order that Nick should read them.
export interface ContextSummary {
  readonly lead: string | undefined
  readonly links: readonly ContextLink[]
}

interface LinkText {
  readonly href: string
  readonly text: string
}

interface LinkScan {
  readonly open: LinkText | undefined
  readonly links: readonly LinkText[]
}

export function contextSummary(markdown: string, page: string): ContextSummary {
  const tokens = blockBodyParser.parse(markdown, {})
  const [first] = tokens
  const start: LinkScan = { open: undefined, links: [] }
  const { links } = withChildren(tokens).reduce(scanLink, start)
  return {
    lead: first?.type === 'paragraph_open' ? textOf(withChildren(tokens.slice(1, 2))) : undefined,
    links: links.flatMap((link) => {
      const target = pageLink(link.href, 1, page)
      return target.kind === 'page'
        ? [{ text: normalisedText(link.text), page: target.page, headingId: target.headingId }]
        : []
    }),
  }
}

function scanLink(scan: LinkScan, token: Token): LinkScan {
  if (token.type === 'link_open') {
    return { open: { href: String(token.attrGet('href')), text: '' }, links: scan.links }
  }
  if (scan.open === undefined) {
    return scan
  }
  if (token.type === 'link_close') {
    return { open: undefined, links: [...scan.links, scan.open] }
  }
  return { ...scan, open: { ...scan.open, text: scan.open.text + plainText(token) } }
}

function textOf(tokens: readonly Token[]): string {
  return normalisedText(tokens.map(plainText).join(''))
}
