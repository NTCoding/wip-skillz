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
// A page that was already visited ends the parents so that a cycle in `parent` can't loop forever.
export function parentsOf(
  pages: readonly PageSummary[],
  page: string,
  visited: ReadonlySet<string> = new Set(),
): PageSummary[] {
  const seen = new Set([...visited, page])
  const parentPage = pages.find((summary) => summary.page === page)?.parent
  const parent = pages.find((summary) => summary.page === parentPage)
  return parent === undefined || seen.has(parent.page)
    ? []
    : [...parentsOf(pages, parent.page, seen), parent]
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

// A link can include the number of a page, like `2.1-wait-between-retries.md`. That name isn't the id of
// a page, but it's the name of the page's file. This returns the id of that page.
export function pageOfFileName(pages: readonly PageSummary[], file: string): string | undefined {
  if (pages.some((summary) => summary.page === `pages/${file}`)) {
    return undefined
  }
  return pages.find((summary) => fileOfPage(summary.file) === file)?.page
}
