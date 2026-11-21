import { type PageSummary } from './api-responses'
import { fileOfPage, type PadAddresses } from './browser-route'
import { type PageListEntry } from './design-system/design-system'
import { indexFile } from './pad-paths'

// The API returns the pages in the order to show them. Each function returns them in the same order.

export function topLevelPages(pages: readonly PageSummary[]): PageSummary[] {
  return pages.filter((summary) => summary.parent === undefined)
}

export function subPagesOf(pages: readonly PageSummary[], page: string): PageSummary[] {
  return pages.filter((summary) => summary.parent === page)
}

// The parents start with the top level page and end with the direct parent of the page.
export function parentsOf(pages: readonly PageSummary[], page: string): PageSummary[] {
  const parentPage = pages.find((summary) => summary.page === page)?.parent
  const parent = pages.find((summary) => summary.page === parentPage)
  return parent === undefined ? [] : [...parentsOf(pages, parent.page), parent]
}

// The list on the index page shows every top level page apart from the index page itself.
export function pageListEntries(
  addresses: PadAddresses,
  pages: readonly PageSummary[],
): PageListEntry[] {
  return topLevelPages(pages)
    .filter((summary) => summary.page !== `pages/${indexFile}`)
    .map((summary) => {
      const file = fileOfPage(summary.page)
      return {
        href: addresses.pageHref(file),
        title: summary.title ?? file,
        description: summary.description,
        ...summary.waitingForNickWithSubPages,
      }
    })
}
