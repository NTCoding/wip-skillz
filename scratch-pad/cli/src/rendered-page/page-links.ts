import { type Token } from 'markdown-it'
import { posix } from 'node:path'
import { isAgentNote } from './agent-note-block'
import { isDecision } from './decision-block'
import { withChildren } from './page-headings'
import { blockBodyParser, pageMarkdownParser } from './page-markdown-parser'

export type PageLink =
  | {
      readonly kind: 'page'
      readonly line: number
      readonly href: string
      readonly page: string
      readonly headingId: string | undefined
    }
  // A reference to a task or a subtask on the progress tracker, which the agent writes as <task:t-4>
  | { readonly kind: 'task'; readonly line: number; readonly href: string; readonly id: string }
  | { readonly kind: 'other'; readonly line: number; readonly href: string }

interface LinkScan {
  readonly line: number
  readonly links: readonly PageLink[]
}

const schemePattern = /^[a-z][a-z\d+.-]*:/i
export const taskReferenceScheme = 'task:'

export function linksOf(tokens: readonly Token[], page: string): PageLink[] {
  return linksAfterLine(tokens, page, 0)
}

// The body of an :::agent-note block is parsed on its own. That's why the lines of its tokens
// start again from 0. linesBefore is the number of the page's lines that come before those tokens.
// The body of a :::decision block is parsed in the same way, because the links in its context are
// links of the page too.
function linksAfterLine(tokens: readonly Token[], page: string, linesBefore: number): PageLink[] {
  const start: LinkScan = { line: linesBefore + 1, links: [] }
  const scan = withChildren(tokens).reduce(
    (current, token) => scanLink(current, token, page, linesBefore),
    start,
  )
  return [...scan.links]
}

function scanLink(scan: LinkScan, token: Token, page: string, linesBefore: number): LinkScan {
  const line = lineOf(scan, token, linesBefore)
  if (isAgentNote(token) || isDecision(token)) {
    const body = blockBodyParser.parse(token.content, {})
    return { line, links: [...scan.links, ...linksAfterLine(body, page, line)] }
  }
  const href = token.attrGet('href')
  return href === null
    ? { line, links: scan.links }
    : { line, links: [...scan.links, pageLink(href, line, page)] }
}

function lineOf(scan: LinkScan, token: Token, linesBefore: number): number {
  if (token.map !== null) {
    return linesBefore + token.map[0] + 1
  }
  return token.type === 'softbreak' || token.type === 'hardbreak' ? scan.line + 1 : scan.line
}

export function pageLink(href: string, line: number, page: string): PageLink {
  const target = pageMarkdownParser.normalizeLinkText(href)
  const hashAt = target.indexOf('#')
  const path = hashAt === -1 ? target : target.slice(0, hashAt)
  const headingId = hashAt === -1 ? undefined : target.slice(hashAt + 1) || undefined
  if (target.startsWith(taskReferenceScheme)) {
    return { kind: 'task', line, href, id: target.slice(taskReferenceScheme.length) }
  }
  if (path === '') {
    return { kind: 'page', line, href, page, headingId }
  }
  if (schemePattern.test(path) || path.startsWith('/') || !path.endsWith('.md')) {
    return { kind: 'other', line, href }
  }
  return { kind: 'page', line, href, page: posix.join(posix.dirname(page), path), headingId }
}
