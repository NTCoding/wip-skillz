import { fileOfPage } from '../browser-page/pad-paths'
import { pageFileOf, parentNumberOf, type PageFile } from '../pages/page-files'
import { type PageLink } from '../rendered-page/page-links'
import { byLine, type PageProblem } from '../rendered-page/page-problem'
import { type RenderedPage } from '../rendered-page/rendered-page'
import { type HtmlBlockSource } from '../rendered-page/named-blocks'
import { type Thread } from '../threads/thread'
import { rawColoursInHtml } from './raw-colours'

export interface CheckedPage {
  readonly page: string
  readonly file: string
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

type ProseProblems = (page: CheckedPage) => readonly string[]

const indexPage = 'pages/index.md'

export function pageCheckProblems(
  pages: readonly CheckedPage[],
  files: readonly PageFile[],
  checkedPages: readonly string[],
  proseProblems: ProseProblems,
): ScratchPadProblem[] {
  const duplicates = duplicateDecisions(pages)
  return pages
    .filter((page) => checkedPages.includes(page.page))
    .flatMap((checked) => [
      ...files
        .filter((file) => file.page === checked.page)
        .flatMap((file) => numberProblems(file, files)),
      ...[
        ...checked.rendered.problems,
        ...checked.rendered.links.flatMap((link) => linkProblems(link, pages)),
        ...duplicates.filter((duplicate) => duplicate.page === checked.file),
        ...checked.rendered.htmlBlocks.flatMap(rawColourProblems),
      ]
        .toSorted(byLine)
        .map((problem) => ({ page: checked.file, line: problem.line, text: problem.text })),
      ...proseProblems(checked).map((text) => ({ page: checked.file, line: undefined, text })),
    ])
}

function numberProblems(file: PageFile, files: readonly PageFile[]): ScratchPadProblem[] {
  const name = fileOfPage(file.page)
  const first = files.find((other) => other.page === file.page)
  const firstWithNumber = files.find(
    (other) => file.number !== undefined && other.number === file.number,
  )
  const parentNumber = parentNumberOf(file.number)
  return [
    ...(file.number === undefined && file.page !== indexPage
      ? [
          `the page doesn't have a number. Rename the file to <number>-${name}, where the number is the place of the page in the order`,
        ]
      : []),
    ...(file.hasLeadingZero
      ? [
          `the number of the page has a leading zero. Write the number as ${String(file.number)} so that it's read the same way everywhere`,
        ]
      : []),
    ...(first !== undefined && first.file !== file.file
      ? [
          `the page has the same name as ${first.file} after its number. Give one of the 2 pages another name`,
        ]
      : []),
    ...(firstWithNumber !== undefined && firstWithNumber.file !== file.file
      ? [
          `the page has the same number ${String(file.number)} as ${firstWithNumber.file}. Give one of the 2 pages another number`,
        ]
      : []),
    ...(parentNumber !== undefined && !files.some((other) => other.number === parentNumber)
      ? [
          `the page is a sub page of page ${parentNumber}, which doesn't exist. Add a page ${parentNumber}-<name>.md or change the number of this page`,
        ]
      : []),
  ].map((text) => ({ page: file.file, line: undefined, text }))
}

function linkProblems(link: PageLink, pages: readonly CheckedPage[]): PageProblem[] {
  if (link.kind === 'other') {
    return []
  }
  const target = pages.find((page) => page.page === link.page)
  if (target === undefined) {
    return [{ line: link.line, text: missingTargetText(link.page, pages) }]
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

function missingTargetText(linkedPage: string, pages: readonly CheckedPage[]): string {
  const { page, number } = pageFileOf(linkedPage)
  return number !== undefined && pages.some((other) => other.page === page)
    ? `the link includes the number ${number} of the page. Write the link as ${fileOfPage(page)} so that it still works after the page is renumbered`
    : `the link points to ${linkedPage}, which doesn't exist`
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
      page: page.file,
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
