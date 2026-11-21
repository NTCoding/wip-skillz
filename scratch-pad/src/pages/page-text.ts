import { countedNoun } from '../counted-noun'
import { pageLink, withLinksNote, type ItemLinks } from '../item-links/item-links'
import { type Heading } from '../rendered-page/page-headings'

export interface PageSummary {
  readonly page: string
  readonly title: string | undefined
  readonly openThreads: number
}

export function numberedLines(lines: readonly string[], first: number, last: number): string[] {
  const width = String(last).length
  return lines
    .slice(first - 1, last)
    .map((text, index) => `    ${String(first + index).padStart(width)} | ${text}`.trimEnd())
}

export function outlineText(page: string, headings: readonly Heading[], links: ItemLinks): string {
  if (headings.length === 0) {
    return `${page} doesn't have any headings`
  }
  const width = String(Math.max(...headings.map((heading) => heading.line))).length
  const lines = headings.map((heading) =>
    withLink(
      `${String(heading.line).padStart(width)}  ${'#'.repeat(heading.level)} ${heading.text}`,
      pageLink(links, page, heading.id),
    ),
  )
  return withLinksNote(links, lines.join('\n'))
}

export function pageListText(pages: readonly PageSummary[], links: ItemLinks): string {
  if (pages.length === 0) {
    return "there aren't any pages in pages/ yet"
  }
  const pageWidth = Math.max(...pages.map((summary) => summary.page.length))
  const titleWidth = Math.max(...pages.map((summary) => titleOf(summary).length))
  const threadsWidth = Math.max(...pages.map((summary) => openThreadsText(summary).length))
  const lines = pages.map((summary) =>
    withLink(
      [
        summary.page.padEnd(pageWidth),
        titleOf(summary).padEnd(titleWidth),
        openThreadsText(summary).padEnd(threadsWidth),
      ].join('  '),
      pageLink(links, summary.page),
    ),
  )
  return withLinksNote(links, lines.join('\n'))
}

function withLink(line: string, link: string | undefined): string {
  return link === undefined ? line.trimEnd() : `${line}  ${link}`
}

function titleOf(summary: PageSummary): string {
  return summary.title ?? '(no title)'
}

function openThreadsText(summary: PageSummary): string {
  return summary.openThreads === 0
    ? 'no open threads'
    : countedNoun(summary.openThreads, 'open thread')
}
