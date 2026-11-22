import { type PageSummary } from './api-responses'
import { fileOfPage, type PadAddresses } from './browser-route'
import {
  type CurrentSubtree,
  type FullTreeNode,
  type PageListEntry,
} from './design-system/design-system'
import { indexFile } from './pad-paths'

// The API returns the pages in the order to show them. Each function returns them in the same order.

type Heading = PageSummary['headings'][number]

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

// The full tree shows the pages, the sub pages and the sections of the pages on every level. The sections are the
// headings of level 2 and 3. A section of level 3 is shown under the section of level 2 above it. Under each page, the
// sections are shown first and the sub pages after them. A page that is already above in the tree isn't shown again
// so that a cycle in `parent` can't loop forever.
export function fullTreeNodes(
  addresses: PadAddresses,
  pages: readonly PageSummary[],
): FullTreeNode[] {
  const pageNode = (summary: PageSummary, above: ReadonlySet<string>): FullTreeNode => {
    const file = fileOfPage(summary.page)
    const seen = new Set([...above, summary.page])
    const title = summary.title ?? file
    return {
      kind: 'page',
      title: summary.number === undefined ? title : `${summary.number} ${title}`,
      href: addresses.pageHref(file),
      children: [
        ...sectionNodes(summary.headings, (id) => addresses.pageHref(file, id)),
        ...subPagesOf(pages, summary.page)
          .filter((subPage) => !seen.has(subPage.page))
          .map((subPage) => pageNode(subPage, seen)),
      ],
    }
  }
  return topLevelPages(pages)
    .filter((summary) => summary.page !== `pages/${indexFile}`)
    .map((summary) => pageNode(summary, new Set()))
}

function containsHref(node: FullTreeNode, href: string): boolean {
  return node.href === href || node.children.some((child) => containsHref(child, href))
}

// The subtree of a page starts at the top level page above it. A page that isn't in the full tree doesn't have a
// subtree.
export function subtreeOf(
  addresses: PadAddresses,
  pages: readonly PageSummary[],
  page: string,
): CurrentSubtree | undefined {
  const currentHref = addresses.pageHref(fileOfPage(page))
  const root = fullTreeNodes(addresses, pages).find((node) => containsHref(node, currentHref))
  return root === undefined ? undefined : { root, currentHref }
}

// A section of level 3 that comes before every section of level 2 is shown on the same level as the sections of
// level 2.
function sectionNodes(
  headings: readonly Heading[],
  hrefOf: (id: string) => string,
): FullTreeNode[] {
  const node = (heading: Heading, children: readonly FullTreeNode[]): FullTreeNode => ({
    kind: 'section',
    title: heading.text,
    href: hrefOf(heading.id),
    children,
  })
  const sections = headings.filter((heading) => heading.level === 2 || heading.level === 3)
  return sections.flatMap((heading, index) => {
    const previous = sections.slice(0, index)
    if (heading.level === 3) {
      return previous.some((each) => each.level === 2) ? [] : [node(heading, [])]
    }
    const after = sections.slice(index + 1)
    const nextSection = after.findIndex((each) => each.level === 2)
    const below = nextSection === -1 ? after : after.slice(0, nextSection)
    return [
      node(
        heading,
        below.map((subsection) => node(subsection, [])),
      ),
    ]
  })
}
