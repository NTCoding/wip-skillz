import { type PageSummary, type ViewedPage } from './api-responses'
import { fileOfPage, type PadAddresses } from './browser-route'
import { Sidebar, SidebarLink, TableOfContents, type Navigate } from './design-system/design-system'

interface PadSidebarProps {
  readonly addresses: PadAddresses
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

export function PadSidebar(props: PadSidebarProps) {
  const { addresses, pages, currentFile, currentPage, onNavigate } = props
  return (
    <Sidebar
      label="Pages of the scratch pad"
      heading="Pages"
      collapsed={props.collapsed}
      onCollapsedChange={props.onCollapsedChange}
    >
      {pages.map((summary) => {
        const file = fileOfPage(summary.page)
        const title = summary.title ?? file
        return (
          <SidebarLink
            key={file}
            href={addresses.pageHref(file)}
            title={title}
            current={file === currentFile}
            onNavigate={onNavigate}
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
      })}
    </Sidebar>
  )
}
