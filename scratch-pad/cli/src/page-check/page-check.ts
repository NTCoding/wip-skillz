import { fileOfPage } from '../browser-page/pad-paths'
import { pageFileOf, parentNumberOf, type PageFile } from '../pages/page-files'
import { type ProgressTracker } from '../progress-tracker/progress-tracker'
import { trackerProblemTexts } from '../progress-tracker/progress-tracker-text'
import { type PageLink } from '../rendered-page/page-links'
import { type DecisionBlock } from '../rendered-page/decision-block'
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
  answeredDecisions: readonly string[],
  // The ids of the tasks and the subtasks on the progress tracker, like t-4
  taskIds: readonly string[],
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
        ...parentLinkProblems(checked, pages, files),
        ...checked.rendered.decisions
          .filter(
            (decision) =>
              decision.options === undefined && !answeredDecisions.includes(decision.id),
          )
          .flatMap(contextProblems),
        ...checked.rendered.links.flatMap((link) => linkProblems(link, pages, taskIds)),
        ...duplicates.filter((duplicate) => duplicate.page === checked.file),
        ...checked.rendered.htmlBlocks.flatMap(rawColourProblems),
      ]
        .toSorted(byLine)
        .map((problem) => ({ page: checked.file, line: problem.line, text: problem.text })),
      ...proseProblems(checked).map((text) => ({ page: checked.file, line: undefined, text })),
    ])
}

// The agent links to a decision page from the page above it. Without the link, Nick can't find the
// decision page from the page that it belongs to. The page above a top level page is the index page.
function parentLinkProblems(
  checked: CheckedPage,
  pages: readonly CheckedPage[],
  files: readonly PageFile[],
): PageProblem[] {
  const { decisionPage } = checked.rendered
  const file = files.find((each) => each.page === checked.page)
  if (decisionPage === undefined || file === undefined) {
    return []
  }
  const parentNumber = parentNumberOf(file.number)
  const parent =
    parentNumber === undefined
      ? indexPage
      : files.find((each) => each.number === parentNumber)?.page
  const parentPage = pages.find((each) => each.page === parent)
  const linked = parentPage?.rendered.links.some(
    (link) => link.kind === 'page' && link.page === checked.page,
  )
  return parentPage === undefined || linked === true
    ? []
    : [
        {
          line: decisionPage.markerLine,
          text: `the decision page isn't linked from its parent page ${parentPage.file}. Add a link to ${fileOfPage(checked.page)} on the parent page`,
        },
      ]
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

// The page still shows a decision without a context. But then Nick has to find out on his own
// which sections he should read before he decides. Only an open decision is reported, because Nick
// has already decided the others. An empty context: line counts as a missing context.
function contextProblems(decision: DecisionBlock): PageProblem[] {
  return decision.context === undefined
    ? [
        {
          line: decision.firstLine,
          text: `decision ${decision.id} doesn't have a context (write one on the context: line)`,
        },
      ]
    : []
}

const taskIdPattern = /^t-[1-9]\d*$/

function linkProblems(
  link: PageLink,
  pages: readonly CheckedPage[],
  taskIds: readonly string[],
): PageProblem[] {
  if (link.kind === 'other') {
    return []
  }
  if (link.kind === 'task') {
    return taskReferenceProblems(link.id, link.line, taskIds)
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

// The page shows a reference to a task that doesn't exist as its text, without a link.
function taskReferenceProblems(
  id: string,
  line: number,
  taskIds: readonly string[],
): PageProblem[] {
  if (!taskIdPattern.test(id)) {
    return [
      {
        line,
        text: `<task:${id}> isn't a task reference. Write the id of the task or the subtask, like <task:t-4>`,
      },
    ]
  }
  return taskIds.includes(id)
    ? []
    : [
        {
          line,
          text: `the task reference <task:${id}> points to ${id}, which isn't a task or a subtask on the progress tracker. Run tasks to list the ids`,
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

// The description of a task or a subtask on the progress tracker, like the description of subtask
// 3.1 [t-5]
export interface CheckedDescription {
  readonly name: string
  readonly links: readonly PageLink[]
}

// A reference to a task in a description is checked in the same way as on a page. The place of a
// problem is the description and its line, which the agent writes again with `task describe` or
// `subtask describe`.
export function descriptionProblems(
  descriptions: readonly CheckedDescription[],
  taskIds: readonly string[],
): ScratchPadProblem[] {
  return descriptions.flatMap((description) =>
    description.links
      .flatMap((link) =>
        link.kind === 'task' ? taskReferenceProblems(link.id, link.line, taskIds) : [],
      )
      .map((problem) => ({
        page: `the description of ${description.name}`,
        line: problem.line,
        text: problem.text,
      })),
  )
}

// The place of a problem on the progress tracker is the progress tracker itself.
export function progressTrackerProblems(tracker: ProgressTracker): ScratchPadProblem[] {
  return trackerProblemTexts(tracker).map((text) => ({
    page: 'the progress tracker',
    line: undefined,
    text,
  }))
}

export function threadsOnMissingPages(
  threads: readonly Thread[],
  pages: readonly string[],
): ScratchPadProblem[] {
  return threads.flatMap((thread) =>
    thread.page === undefined || thread.waitsFor === 'nobody' || pages.includes(thread.page)
      ? []
      : [
          {
            page: thread.page,
            line: undefined,
            text: `${thread.id} is still open on a page that doesn't exist any more. Restore the page or reply to ${thread.id} so that Nick can resolve it in his Inbox`,
          },
        ],
  )
}
