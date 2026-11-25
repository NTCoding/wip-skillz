import { join } from 'node:path'
import {
  descriptionProblems,
  pageCheckProblems,
  progressTrackerProblems,
  threadsOnMissingPages,
  type CheckedDescription,
} from '../page-check/page-check'
import { readyDecisionPages } from '../decision-pages/ready-decision-pages'
import { pageCheckText } from '../page-check/page-check-text'
import { findPage } from '../pages/page-markdown'
import { itemName, trackerItems, type TrackerItem } from '../progress-tracker/progress-tracker'
import { type ProseCheck } from '../prose-check/prose-check'
import { renderDetails, renderPage } from '../rendered-page/rendered-page'
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
  const ready = readyDecisionPages(folder)
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
        readyDecisionPages: ready,
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
  const tracker = folder.read((pad) => pad.readProgressTracker())
  const items = trackerItems(tracker)
  const taskIds = items.map((item) => item.id)
  // The descriptions and the progress tracker are only checked when every page is checked.
  const everyPage = requested.length === 0
  const descriptions = everyPage ? describedItems(items) : []
  const problems = [
    ...pageCheckProblems(
      rendered,
      folder.pageFiles(),
      checkedPages,
      answeredDecisions,
      taskIds,
      (checked) =>
        proseCheck === undefined
          ? []
          : proseCheck(
              join(folder.path, checked.file),
              folder.readPageLines(checked.page).join('\n'),
            ),
    ),
    ...orphans,
    ...descriptionProblems(descriptions, taskIds),
    ...(everyPage ? progressTrackerProblems(tracker) : []),
  ]
  return { text: pageCheckText(problems, checkedPages.length), problemCount: problems.length }
}

// The descriptions are only checked when every page is checked. Their links are resolved as if
// they were on the index page, like on the progress tracker.
function describedItems(items: readonly TrackerItem[]): CheckedDescription[] {
  return items.flatMap((item) =>
    item.description === undefined
      ? []
      : [
          {
            name: `${itemName(item)} [${item.id}]`,
            links: renderDetails({
              page: 'pages/index.md',
              markdown: item.description,
              readCustomFile: () => undefined,
            }).links,
          },
        ],
  )
}
