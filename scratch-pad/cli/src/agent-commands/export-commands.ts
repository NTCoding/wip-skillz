import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { countedNoun } from '../counted-noun'
import { exportedBrowserPageHtml } from '../local-server/browser-page'
import { type BrowserPageBundle } from '../local-server/browser-page-bundle'
import {
  decisionLogOf,
  decisionsOfPad,
  improvementsOf,
  pageSummaries,
  progressTrackerOf,
  threadsOfPage,
  viewPage,
} from '../nick-views/nick-views'
import { ScratchPadError } from '../scratch-pad-error'
import { type ScratchPadFolder } from '../scratch-pad-folder/scratch-pad-folder'

const exportFile = 'export.html'

export class ExportNotWrittenError extends ScratchPadError {
  constructor(path: string, error: unknown) {
    super(
      `The export can't be written to ${path} (${String(error)}). Pick another file with --out <file>.`,
    )
  }
}

interface ExportOptions {
  readonly out: string | undefined
  readonly bundle: BrowserPageBundle
}

export function exportScratchPad(folder: ScratchPadFolder, options: ExportOptions): string {
  const pages = pageSummaries(folder)
  const threads = pages.flatMap((summary) => threadsOfPage(folder, summary.page))
  const progressTracker = progressTrackerOf(folder)
  const html = exportedBrowserPageHtml({
    padName: folder.name,
    title: progressTracker.title,
    data: {
      pages,
      viewedPages: pages.map((summary) => viewPage(folder, summary.page)),
      threads,
      progressTracker,
      decisionLog: decisionLogOf(folder),
      decisions: decisionsOfPad(folder),
      improvements: improvementsOf(folder),
    },
    bundle: options.bundle,
  })
  const path = options.out === undefined ? join(folder.path, exportFile) : resolve(options.out)
  try {
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, html)
  } catch (error) {
    throw new ExportNotWrittenError(path, error)
  }
  return `exported ${countedNoun(pages.length, 'page')} and ${countedNoun(threads.length, 'thread')} to ${path}`
}
