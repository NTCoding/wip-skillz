import { type PageLink } from '../rendered-page/page-links'
import { byLine, type PageProblem } from '../rendered-page/page-problem'
import { type RenderedPage } from '../rendered-page/rendered-page'

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
