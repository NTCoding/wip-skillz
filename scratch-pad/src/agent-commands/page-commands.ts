import { pageSummaries } from '../nick-views/nick-views'
import { type ItemLinks } from '../item-links/item-links'
import { findPage } from '../pages/page-markdown'
import { outlineText, pageListText } from '../pages/page-text'
import { pageHeadings } from '../rendered-page/rendered-page'
import { type ScratchPadFolder } from '../scratch-pad-folder/scratch-pad-folder'

export function listPages(folder: ScratchPadFolder, links: ItemLinks): string {
  return pageListText(pageSummaries(folder), links)
}

export function outlinePage(folder: ScratchPadFolder, requested: string, links: ItemLinks): string {
  const page = findPage(folder.pages(), requested, folder.name)
  const { file, lines } = folder.readPage(page)
  return outlineText(page, file, pageHeadings(lines.join('\n')), links)
}
