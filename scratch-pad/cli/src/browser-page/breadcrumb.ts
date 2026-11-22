import { type PageSummary, type ViewedPage } from './api-responses'
import { fileOfPage, type BrowserRoute, type PadAddresses } from './browser-route'
import { type CurrentSubtree } from './design-system/design-system'
import { parentsOf, subtreeOf } from './page-tree'

interface Breadcrumb {
  readonly parents: readonly { readonly title: string; readonly href: string }[]
  readonly current: string | undefined
  readonly subtree?: CurrentSubtree | undefined
}

export function breadcrumbOf(
  route: BrowserRoute,
  viewedPage: ViewedPage | undefined,
  pageList: readonly PageSummary[],
  addresses: PadAddresses,
): Breadcrumb {
  if (route.kind === 'progress-tracker') {
    return { parents: [], current: 'Progress tracker' }
  }
  if (route.kind === 'decision-log') {
    return { parents: [], current: 'Decisions' }
  }
  if (route.kind === 'improvements') {
    return { parents: [], current: 'Improvements' }
  }
  if (route.kind === 'inbox-outbox') {
    return { parents: [], current: 'Inbox / Outbox' }
  }
  if (route.file === 'index.md') {
    return { parents: [], current: undefined }
  }
  const page = `pages/${route.file}`
  const summary = pageList.find((each) => each.page === page)
  return {
    parents: parentsOf(pageList, page).map((parent) => {
      const file = fileOfPage(parent.page)
      return { title: parent.title ?? file, href: addresses.pageHref(file) }
    }),
    current: viewedPage?.title ?? summary?.title ?? route.file,
    subtree: subtreeOf(addresses, pageList, page),
  }
}
