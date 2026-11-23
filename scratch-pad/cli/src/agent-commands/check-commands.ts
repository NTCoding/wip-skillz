import { join } from 'node:path'
import { pageCheckProblems, threadsOnMissingPages } from '../page-check/page-check'
import { pageCheckText } from '../page-check/page-check-text'
import { findPage } from '../pages/page-markdown'
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
  const pages = folder.pages()
  const found = new Set(requested.map((page) => findPage(pages, page, folder.name)))
  const checkedPages = requested.length === 0 ? pages : pages.filter((page) => found.has(page))
  const rendered = pages.map((page) => {
    const { file, lines } = folder.readPage(page)
    const markdown = lines.join('\n')
    return {
      page,
      file,
      rendered: renderPage({
        page,
        markdown,
        readCustomFile: (custom) =>
          checkedPages.includes(page) ? folder.readCustomFile(custom) : undefined,
      }),
    }
  })
  const orphans =
    requested.length === 0
      ? threadsOnMissingPages(
          folder.read((pad) => pad.readThreads()),
          pages,
        )
      : []
  const answeredDecisions = folder
    .read((pad) => pad.readDecisionAnswers())
    .map((answer) => answer.id)
  const problems = [
    ...pageCheckProblems(
      rendered,
      folder.pageFiles(),
      checkedPages,
      answeredDecisions,
      (checked) =>
        proseCheck === undefined
          ? []
          : proseCheck(
              join(folder.path, checked.file),
              folder.readPageLines(checked.page).join('\n'),
            ),
    ),
    ...orphans,
  ]
  return { text: pageCheckText(problems, checkedPages.length), problemCount: problems.length }
}
