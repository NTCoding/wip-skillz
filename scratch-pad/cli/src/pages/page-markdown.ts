import { pageHeadings } from '../rendered-page/rendered-page'
import { ScratchPadError } from '../scratch-pad-error'
import { pageFileOf } from './page-files'

const pagePattern = /^pages\/[^/]+\.md$/

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

export function existingPage(pages: readonly string[], requested: string): string | undefined {
  const candidates = [requested, `pages/${requested}`, `pages/${requested}.md`].map(
    (candidate) => pageFileOf(candidate).page,
  )
  return pages.find((candidate) => candidates.includes(candidate))
}

export function findPage(pages: readonly string[], requested: string, padName: string): string {
  const page = existingPage(pages, requested)
  if (page === undefined) {
    throw new UnknownPageError(requested, padName, pages)
  }
  return page
}
