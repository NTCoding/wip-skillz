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

function changedSectionsText(count: number): string {
  return count === 1 ? '1 section changed' : `${count} sections changed`
}

function entryOf(
  addresses: PadAddresses,
  mark: PageReadMark,
  pages: readonly PageSummary[],
): InboxEntry[] {
  const where = placeOf(pages, mark.page, undefined)
  if (mark.state === 'new') {
    return [
      {
        key: `page ${mark.page}`,
        href: addresses.pageHref(fileOfPage(mark.page)),
        kind: 'page',
        heading: 'A new page',
        where,
        quote: pages.find((summary) => summary.page === mark.page)?.description,
        last: undefined,
        time: mark.changedTime,
        shownTime: shownTime(mark.changedTime),
        context: undefined,
      },
    ]
  }
  const [first] = mark.changedSections
  return first === undefined
    ? []
    : [
        {
          key: `sections ${mark.page}`,
          href: addresses.pageHref(fileOfPage(mark.page), first.id),
          kind: 'section',
          heading: `Updates to ${where}`,
          where: changedSectionsText(mark.changedSections.length),
          quote: undefined,
          last: undefined,
          time: mark.changedTime,
          shownTime: shownTime(mark.changedTime),
          context: undefined,
        },
      ]
}

// The Inbox lists each new page and each page with changed sections, the newest first. The entry
// of a page with changed sections links to the first changed section. The Inbox lists every page,
// including a sub page that the sidebar doesn't show.
export function readMarkEntries(
  addresses: PadAddresses,
  marks: ReadMarks,
  pages: readonly PageSummary[],
): InboxEntry[] {
  return marks.pages.toSorted(newestFirst).flatMap((mark) => entryOf(addresses, mark, pages))
}
