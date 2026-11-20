import { findPage, pageHeadings, pagesInOrder, pageTitle } from '../pages/page-markdown'
import { outlineText, pageListText } from '../pages/page-text'
import { type ScratchPadFolder } from '../scratch-pad-folder/scratch-pad-folder'

export function listPages(folder: ScratchPadFolder): string {
  const openThreads = folder
    .read((pad) => pad.readThreads())
    .filter((thread) => thread.waitsFor !== 'nobody')
  return pageListText(
    pagesInOrder(folder.pages()).map((page) => ({
      page,
      title: pageTitle(folder.readPageLines(page)),
      openThreads: openThreads.filter((thread) => thread.page === page).length,
    })),
  )
}

export function outlinePage(folder: ScratchPadFolder, requested: string): string {
  const page = findPage(folder.pages(), requested, folder.name)
  return outlineText(page, pageHeadings(folder.readPageLines(page)))
}
