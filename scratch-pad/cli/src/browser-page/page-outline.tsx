import { type ViewedPage } from './api-responses'
import { fileOfPage, type PadAddresses } from './browser-route'
import { useCurrentSection, type PageAddress } from './current-section'
import { Outline, type Navigate } from './design-system/design-system'

interface PageOutlineProps {
  readonly addresses: PadAddresses
  readonly page: ViewedPage
  readonly onNavigate: Navigate
  readonly address: PageAddress
}

function outlineOf(page: ViewedPage): ViewedPage['headings'] {
  return page.headings.filter((heading) => heading.level >= 2 && heading.level <= 4)
}

export function PageOutline({ addresses, page, onNavigate, address }: PageOutlineProps) {
  const entries = outlineOf(page)
  const currentSection = useCurrentSection(
    entries.map((heading) => heading.id),
    address,
  )
  const file = fileOfPage(page.page)
  return (
    <Outline
      label={`Outline of ${page.title ?? file}`}
      entries={entries}
      currentId={currentSection}
      hrefOf={(id) => addresses.pageHref(file, id)}
      onNavigate={onNavigate}
    />
  )
}
