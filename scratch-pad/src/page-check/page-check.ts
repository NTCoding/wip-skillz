import { type PageLink } from '../rendered-page/page-links'
import { byLine, type PageProblem } from '../rendered-page/page-problem'
import { type RenderedPage } from '../rendered-page/rendered-page'
import { type HtmlBlockSource } from '../rendered-page/named-blocks'
import { type Thread } from '../threads/thread'
import { rawColoursInHtml } from './raw-colours'

export interface CheckedPage {
  readonly page: string
  readonly rendered: RenderedPage
}

export interface ScratchPadProblem {
  readonly page: string
  readonly line: number | undefined
  readonly text: string
}

interface DecisionPlace {
  readonly id: string
  readonly page: string
  readonly line: number
}

type ProseProblems = (page: string) => readonly string[]

export function pageCheckProblems(
  pages: readonly CheckedPage[],
  checkedPages: readonly string[],
  proseProblems: ProseProblems,
): ScratchPadProblem[] {
  const duplicates = duplicateDecisions(pages)
  return pages
    .filter((page) => checkedPages.includes(page.page))
    .flatMap((checked) => [
      ...[
        ...checked.rendered.problems,
        ...checked.rendered.links.flatMap((link) => linkProblems(link, pages)),
        ...duplicates.filter((duplicate) => duplicate.page === checked.page),
        ...checked.rendered.htmlBlocks.flatMap(rawColourProblems),
      ]
        .toSorted(byLine)
        .map((problem) => ({ page: checked.page, line: problem.line, text: problem.text })),
      ...proseProblems(checked.page).map((text) => ({ page: checked.page, line: undefined, text })),
    ])
}

function linkProblems(link: PageLink, pages: readonly CheckedPage[]): PageProblem[] {
  if (link.kind === 'other') {
    return []
  }
  const target = pages.find((page) => page.page === link.page)
  if (target === undefined) {
    return [{ line: link.line, text: `the link points to ${link.page}, which doesn't exist` }]
  }
  const headingId = link.headingId
  if (
    headingId === undefined ||
    target.rendered.headings.some((heading) => heading.id === headingId)
  ) {
    return []
  }
  return [
    {
      line: link.line,
      text: `the link points to the heading #${headingId} in ${link.page}, which doesn't exist`,
    },
  ]
}

function rawColourProblems(block: HtmlBlockSource): PageProblem[] {
  const colours = rawColoursInHtml(block.html)
  return colours.length === 0
    ? []
    : [
        {
          line: block.line,
          text: `the :::html block uses the raw ${colours.length === 1 ? 'colour' : 'colours'} ${colours.join(', ')}. Use a design token like var(--accent) instead`,
        },
      ]
}

function duplicateDecisions(pages: readonly CheckedPage[]): (PageProblem & { page: string })[] {
  const places: DecisionPlace[] = pages.flatMap((page) =>
    page.rendered.decisions.map((decision) => ({
      id: decision.id,
      page: page.page,
      line: decision.firstLine,
    })),
  )
  return places.flatMap((place, index) => {
    const first = places.slice(0, index).find((earlier) => earlier.id === place.id)
    if (first === undefined) {
      return []
    }
    const where = first.page === place.page ? `line ${first.line}` : `${first.page}:${first.line}`
    return [{ ...place, text: `decision ${place.id} is used twice (first on ${where})` }]
  })
}

export function threadsOnMissingPages(
  threads: readonly Thread[],
  pages: readonly string[],
): ScratchPadProblem[] {
  return threads
    .filter((thread) => thread.waitsFor !== 'nobody' && !pages.includes(thread.page))
    .map((thread) => ({
      page: thread.page,
      line: undefined,
      text: `${thread.id} is still open on a page that doesn't exist any more. Restore the page or reply to ${thread.id} so that Nick can resolve it in his Inbox`,
    }))
}
