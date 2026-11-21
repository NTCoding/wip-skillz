import { type ReactNode } from 'react'
import { type PageSummary, type ViewedPage } from './api-responses'
import { fileOfPage, type BrowserRoute, type PadAddresses } from './browser-route'
import { Sidebar, SidebarLink, TableOfContents, type Navigate } from './design-system/design-system'
import { parentsOf, subPagesOf, topLevelPages } from './page-tree'

interface PadSidebarProps {
  readonly addresses: PadAddresses
  readonly title: string
  readonly view: BrowserRoute['kind']
  readonly pages: readonly PageSummary[]
  readonly currentFile: string | undefined
  readonly currentPage: ViewedPage | undefined
  readonly currentSection: string | undefined
  readonly collapsed: boolean
  readonly onCollapsedChange: (collapsed: boolean) => void
  readonly onNavigate: Navigate
}

export function sectionsOf(page: ViewedPage | undefined): ViewedPage['headings'] {
  return (page?.headings ?? []).filter((heading) => heading.level === 2 || heading.level === 3)
}

// Only the top level page of the open page shows its sub pages, at every depth.
function openBranchOf(pages: readonly PageSummary[], file: string | undefined): string | undefined {
  if (file === undefined) {
    return undefined
  }
  const page = `pages/${file}`
  return parentsOf(pages, page)[0]?.page ?? page
}

export function PadSidebar(props: PadSidebarProps) {
  const { addresses, pages, currentFile, currentPage, onNavigate } = props
  const openBranch = openBranchOf(pages, currentFile)
  const pageLink = (summary: PageSummary, withSubPages: boolean): ReactNode => {
    const file = fileOfPage(summary.page)
    const title = summary.title ?? file
    const subPages = withSubPages ? subPagesOf(pages, summary.page) : []
    return (
      <SidebarLink
        key={file}
        href={addresses.pageHref(file)}
        title={title}
        current={file === currentFile}
        onNavigate={onNavigate}
        subPages={
          subPages.length === 0 ? undefined : subPages.map((subPage) => pageLink(subPage, true))
        }
      >
        <TableOfContents
          label={`Sections of ${title}`}
          entries={sectionsOf(currentPage)}
          currentId={props.currentSection}
          hrefOf={(id) => addresses.pageHref(file, id)}
          onNavigate={onNavigate}
        />
      </SidebarLink>
    )
  }
  return (
    <Sidebar
      label="Pages of the scratch pad"
      title={props.title}
      titleHref={addresses.pageHref('index.md')}
      onNavigate={onNavigate}
      views={
        <>
          <SidebarLink
            href={addresses.progressTrackerHref}
            icon="progress-tracker"
            title="Progress tracker"
            current={props.view === 'progress-tracker'}
            onNavigate={onNavigate}
          />
          <SidebarLink
            href={addresses.decisionLogHref}
            icon="decision"
            title="Decisions"
            current={props.view === 'decision-log'}
            onNavigate={onNavigate}
          />
        </>
      }
      heading="Pages"
      collapsed={props.collapsed}
      onCollapsedChange={props.onCollapsedChange}
    >
      {topLevelPages(pages).map((summary) => pageLink(summary, summary.page === openBranch))}
    </Sidebar>
  )
}
