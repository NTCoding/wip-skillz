import { join } from 'node:path'
import { pageCheckProblems, threadsOnMissingPages } from '../page-check/page-check'
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
  requested: readonly string[],
  proseCheck: ProseCheck | undefined,
): CheckResult {
  const pages = pagesInOrder(folder.pages())
  const found = new Set(requested.map((page) => findPage(pages, page, folder.name)))
  const checkedPages = requested.length === 0 ? pages : pages.filter((page) => found.has(page))
  const markdownOf = (page: string) => folder.readPageLines(page).join('\n')
  const rendered = pages.map((page) => ({
    page,
    rendered: renderPage({
      page,
      markdown: markdownOf(page),
      readCustomFile: (file) =>
        checkedPages.includes(page) ? folder.readCustomFile(file) : undefined,
    }),
  }))
  const orphans =
    requested.length === 0
      ? threadsOnMissingPages(
          folder.read((pad) => pad.readThreads()),
          pages,
        )
      : []
  const problems = [
    ...pageCheckProblems(rendered, checkedPages, (page) =>
      proseCheck === undefined ? [] : proseCheck(join(folder.path, page), markdownOf(page)),
    ),
    ...orphans,
  ]
  return { text: pageCheckText(problems, checkedPages.length), problemCount: problems.length }
}
