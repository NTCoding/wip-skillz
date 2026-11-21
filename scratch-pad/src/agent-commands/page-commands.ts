import { pageSummaries } from '../nick-views/nick-views'
import { findPage } from '../pages/page-markdown'
import { outlineText, pageListText } from '../pages/page-text'
import { pageHeadings } from '../rendered-page/rendered-page'
import { type ScratchPadFolder } from '../scratch-pad-folder/scratch-pad-folder'

export function listPages(folder: ScratchPadFolder): string {
  return pageListText(pageSummaries(folder))
}

export function outlinePage(folder: ScratchPadFolder, requested: string): string {
  const page = findPage(folder.pages(), requested, folder.name)
  return outlineText(page, pageHeadings(folder.readPageLines(page).join('\n')))
}
