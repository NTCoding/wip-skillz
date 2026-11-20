import { countedNoun } from '../counted-noun'
import { type Heading } from '../rendered-page/page-headings'

interface PageSummary {
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

export function outlineText(page: string, headings: readonly Heading[]): string {
  const width = String(headings.at(-1)?.line ?? 0).length
  const lines = headings.map(
    (heading) =>
      `${String(heading.line).padStart(width)}  ${'#'.repeat(heading.level)} ${heading.text}`,
  )
  return lines.length === 0 ? `${page} doesn't have any headings` : lines.join('\n')
}

export function pageListText(pages: readonly PageSummary[]): string {
  if (pages.length === 0) {
    return "there aren't any pages in pages/ yet"
  }
  const pageWidth = Math.max(...pages.map((summary) => summary.page.length))
  const titleWidth = Math.max(...pages.map((summary) => titleOf(summary).length))
  return pages
    .map((summary) =>
      [
        summary.page.padEnd(pageWidth),
        titleOf(summary).padEnd(titleWidth),
        openThreadsText(summary.openThreads),
      ].join('  '),
    )
    .join('\n')
}

function titleOf(summary: PageSummary): string {
  return summary.title ?? '(no title)'
}

function openThreadsText(count: number): string {
  return count === 0 ? 'no open threads' : countedNoun(count, 'open thread')
}
