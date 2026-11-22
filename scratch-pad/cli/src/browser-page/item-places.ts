import { type PageSummary, type QueuedItem, type Thread } from './api-responses'
import { fileOfPage } from './browser-route'
import { parentsOf } from './page-tree'

// The place of an item is the page and the section that the item is on, like
// "Invoice template › 1.1 Tax number › Shops outside the EU". A sub page is shown after its top
// level page together with its number.

function titleOf(pages: readonly PageSummary[], page: string): string {
  return pages.find((summary) => summary.page === page)?.title ?? fileOfPage(page)
}

function pagePlace(pages: readonly PageSummary[], page: string): string[] {
  const [topLevel] = parentsOf(pages, page)
  if (topLevel === undefined) {
    return [titleOf(pages, page)]
  }
  const number = pages.find((summary) => summary.page === page)?.number
  const title = titleOf(pages, page)
  const numbered = [number, title].filter((part) => part !== undefined).join(' ')
  return [titleOf(pages, topLevel.page), numbered]
}

// A section starts at a heading of level 2 or 3. A heading of level 1 ends the section above it.
function sectionAt(
  pages: readonly PageSummary[],
  page: string,
  line: number | undefined,
): string | undefined {
  const headings = pages.find((summary) => summary.page === page)?.headings ?? []
  const heading =
    line === undefined
      ? undefined
      : headings.findLast((each) => each.level <= 3 && each.line <= line)
  return heading === undefined || heading.level === 1 ? undefined : heading.text
}

export function placeOf(
  pages: readonly PageSummary[],
  page: string,
  section: string | undefined,
): string {
  return [...pagePlace(pages, page), ...(section === undefined ? [] : [section])].join(' › ')
}

function lineOfThread(thread: Thread): number | undefined {
  return thread.position?.kind === 'attached' ? thread.position.firstLine : thread.anchor?.firstLine
}

export function threadPlace(pages: readonly PageSummary[], thread: Thread): string {
  return placeOf(pages, thread.page, sectionAt(pages, thread.page, lineOfThread(thread)))
}

export function queuedCommentPlace(
  pages: readonly PageSummary[],
  item: Extract<QueuedItem, { kind: 'comment' }>,
): string {
  const line = item.position.kind === 'attached' ? item.position.firstLine : item.anchor.firstLine
  return placeOf(pages, item.page, sectionAt(pages, item.page, line))
}

// A thread without an anchor, like a note on a whole page, quotes its first message.
export function quoteOf(thread: Thread, firstMessage: string): string {
  if (thread.position?.kind === 'attached') {
    return thread.position.text
  }
  return thread.anchor?.selectedText ?? firstMessage
}
