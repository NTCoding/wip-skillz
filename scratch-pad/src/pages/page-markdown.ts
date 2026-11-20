import { pageHeadings } from '../rendered-page/rendered-page'
import { ScratchPadError } from '../scratch-pad-error'

const pagePattern = /^pages\/[^/]+\.md$/
const indexPage = 'pages/index.md'

export class UnknownPageError extends ScratchPadError {
  constructor(page: string, padName: string, pages: readonly string[]) {
    super(`There isn't any page called ${page} in ${padName}. The pages are: ${pages.join(', ')}`)
  }
}

export function pageTitle(lines: readonly string[]): string | undefined {
  return pageHeadings(lines.join('\n')).find((heading) => heading.level === 1)?.text
}

export function sectionAt(lines: readonly string[], line: number): string | undefined {
  return pageHeadings(lines.join('\n')).findLast((heading) => heading.line <= line)?.text
}

export function isPagePath(page: string): boolean {
  return pagePattern.test(page)
}

export function findPage(pages: readonly string[], requested: string, padName: string): string {
  const candidates = [requested, `pages/${requested}`, `pages/${requested}.md`]
  const page = pages.find((candidate) => candidates.includes(candidate))
  if (page === undefined) {
    throw new UnknownPageError(requested, padName, pagesInOrder(pages))
  }
  return page
}

export function pagesInOrder(pages: readonly string[]): string[] {
  return pages.toSorted(
    (first, second) => pageOrder(first) - pageOrder(second) || first.localeCompare(second),
  )
}

function pageOrder(page: string): number {
  return page === indexPage ? 0 : 1
}
