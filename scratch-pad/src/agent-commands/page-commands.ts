import { findPage, pagesInOrder, pageTitle } from '../pages/page-markdown'
import { outlineText, pageListText, type PageSummary } from '../pages/page-text'
import { pageHeadings } from '../rendered-page/rendered-page'
import { type ScratchPadFolder } from '../scratch-pad-folder/scratch-pad-folder'

export function listPages(folder: ScratchPadFolder): string {
  return pageListText(pageSummaries(folder))
}

export function pageSummaries(folder: ScratchPadFolder): PageSummary[] {
  const openThreads = folder
    .read((pad) => pad.readThreads())
    .filter((thread) => thread.waitsFor !== 'nobody')
  return pagesInOrder(folder.pages()).map((page) => ({
    page,
    title: pageTitle(folder.readPageLines(page)),
    openThreads: openThreads.filter((thread) => thread.page === page).length,
  }))
}

export function outlinePage(folder: ScratchPadFolder, requested: string): string {
  const page = findPage(folder.pages(), requested, folder.name)
  return outlineText(page, pageHeadings(folder.readPageLines(page).join('\n')))
}
