import { join } from 'node:path'
import { pageCheckProblems } from '../page-check/page-check'
import { pageCheckText } from '../page-check/page-check-text'
import { findPage, pagesInOrder } from '../pages/page-markdown'
import { type ProseCheck } from '../prose-check/prose-check'
import { renderPage } from '../rendered-page/rendered-page'
import { type ScratchPadFolder } from '../scratch-pad-folder/scratch-pad-folder'

interface CheckResult {
  readonly text: string
  readonly problemCount: number
}

export function checkPages(
  folder: ScratchPadFolder,
  requested: string | undefined,
  proseCheck: ProseCheck | undefined,
): CheckResult {
  const pages = pagesInOrder(folder.pages())
  const checkedPages = requested === undefined ? pages : [findPage(pages, requested, folder.name)]
  const rendered = pages.map((page) => ({
    page,
    rendered: renderPage({
      page,
      markdown: folder.readPageLines(page).join('\n'),
      readCustomFile: (file) => folder.readCustomFile(file),
    }),
  }))
  const problems = pageCheckProblems(rendered, checkedPages, (page) =>
    proseCheck === undefined ? [] : proseCheck(join(folder.path, page)),
  )
  return { text: pageCheckText(problems, checkedPages.length), problemCount: problems.length }
}
