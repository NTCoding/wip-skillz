import { type ViewedPage } from './api-responses'
import { fileOfPage, type PadAddresses } from './browser-route'
import { useCurrentSection } from './current-section'
import { Outline, type Navigate } from './design-system/design-system'

interface PageOutlineProps {
  readonly addresses: PadAddresses
  readonly page: ViewedPage
  readonly onNavigate: Navigate
}

function outlineOf(page: ViewedPage): ViewedPage['headings'] {
  return page.headings.filter((heading) => heading.level >= 2 && heading.level <= 4)
}

export function PageOutline({ addresses, page, onNavigate }: PageOutlineProps) {
  const entries = outlineOf(page)
  const currentSection = useCurrentSection(entries.map((heading) => heading.id))
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
