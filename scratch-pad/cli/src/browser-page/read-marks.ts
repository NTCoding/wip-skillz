import { type PageReadMark, type PageSummary, type ReadMarks } from './api-responses'
import { fileOfPage, type PadAddresses } from './browser-route'
import { type InboxEntry } from './design-system/design-system'
import { placeOf } from './item-places'
import { shownTime } from './message-time'

export function readMarkOf(marks: ReadMarks, page: string): PageReadMark | undefined {
  return marks.pages.find((mark) => mark.page === page)
}

// The dot of a page in the sidebar
export function sidebarMarkOf(mark: PageReadMark | undefined): 'new' | 'changed' | undefined {
  if (mark?.state === 'new') {
    return 'new'
  }
  return mark !== undefined && mark.changedSections.length > 0 ? 'changed' : undefined
}

function newestFirst(first: PageReadMark, second: PageReadMark): number {
  return second.changedTime.localeCompare(first.changedTime)
}

// The new pages come first and then the changed sections, each with the newest first. The Inbox
// lists every page, including a sub page that the sidebar doesn't show.
export function readMarkEntries(
  addresses: PadAddresses,
  marks: ReadMarks,
  pages: readonly PageSummary[],
): InboxEntry[] {
  const sorted = marks.pages.toSorted(newestFirst)
  const newPages = sorted
    .filter((mark) => mark.state === 'new')
    .map((mark): InboxEntry => ({
      key: `page ${mark.page}`,
      href: addresses.pageHref(fileOfPage(mark.page)),
      kind: 'page',
      where: placeOf(pages, mark.page, undefined),
      quote: pages.find((summary) => summary.page === mark.page)?.description,
      last: undefined,
      time: mark.changedTime,
      shownTime: shownTime(mark.changedTime),
    }))
  const changedSections = sorted.flatMap((mark) =>
    mark.changedSections.map((section): InboxEntry => ({
      key: `section ${mark.page} ${section.id}`,
      href: addresses.pageHref(fileOfPage(mark.page), section.id),
      kind: 'section',
      where: placeOf(pages, mark.page, section.title),
      quote: undefined,
      last: undefined,
      time: mark.changedTime,
      shownTime: `Changed ${shownTime(mark.changedTime)}`,
    })),
  )
  return [...newPages, ...changedSections]
}
