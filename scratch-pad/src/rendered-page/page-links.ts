import { type Token } from 'markdown-it'
import { posix } from 'node:path'
import { withChildren } from './page-headings'
import { pageMarkdownParser } from './page-markdown-parser'

export type PageLink =
  | {
      readonly kind: 'page'
      readonly line: number
      readonly href: string
      readonly page: string
      readonly headingId: string | undefined
    }
  | { readonly kind: 'other'; readonly line: number; readonly href: string }

interface LinkScan {
  readonly line: number
  readonly links: readonly PageLink[]
}

const schemePattern = /^[a-z][a-z\d+.-]*:/i

export function linksOf(tokens: readonly Token[], page: string): PageLink[] {
  const start: LinkScan = { line: 1, links: [] }
  return [...withChildren(tokens).reduce((scan, token) => scanLink(scan, token, page), start).links]
}

function scanLink(scan: LinkScan, token: Token, page: string): LinkScan {
  const line = lineOf(scan, token)
  const href = token.attrGet('href')
  return href === null
    ? { line, links: scan.links }
    : { line, links: [...scan.links, pageLink(href, line, page)] }
}

function lineOf(scan: LinkScan, token: Token): number {
  if (token.map !== null) {
    return token.map[0] + 1
  }
  return token.type === 'softbreak' || token.type === 'hardbreak' ? scan.line + 1 : scan.line
}

function pageLink(href: string, line: number, page: string): PageLink {
  const target = pageMarkdownParser.normalizeLinkText(href)
  const hashAt = target.indexOf('#')
  const path = hashAt === -1 ? target : target.slice(0, hashAt)
  const headingId = hashAt === -1 ? undefined : target.slice(hashAt + 1) || undefined
  if (path === '') {
    return { kind: 'page', line, href, page, headingId }
  }
  if (schemePattern.test(path) || path.startsWith('/') || !path.endsWith('.md')) {
    return { kind: 'other', line, href }
  }
  return { kind: 'page', line, href, page: posix.join(posix.dirname(page), path), headingId }
}
