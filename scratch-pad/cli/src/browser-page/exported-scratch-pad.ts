import { exportedPadData } from './api-responses'
import { BrowserPageError } from './browser-page-error'
import { type ScratchPadReading } from './scratch-pad-connection'

export class UnknownExportedPageError extends BrowserPageError {
  constructor(file: string) {
    super(`The export doesn’t have a page called ${file}.`)
  }
}

export class BrokenExportError extends BrowserPageError {
  constructor() {
    super('The data of the export is broken. Export the scratch pad again with scratch-pad export.')
  }
}

function parsedExport(json: string): ReturnType<typeof exportedPadData.parse> {
  try {
    return exportedPadData.parse(JSON.parse(json))
  } catch {
    throw new BrokenExportError()
  }
}

export function exportedScratchPad(json: string): ScratchPadReading {
  const data = parsedExport(json)
  return {
    pages: () => Promise.resolve(data.pages),
    page: (file) => {
      const page = data.viewedPages.find((viewed) => viewed.page === `pages/${file}`)
      return page === undefined
        ? Promise.reject(new UnknownExportedPageError(file))
        : Promise.resolve(page)
    },
    threads: (file) =>
      Promise.resolve(data.threads.filter((thread) => thread.page === `pages/${file}`)),
    nickInbox: () => Promise.resolve({ threads: [], decisions: [] }),
    progressTracker: () => Promise.resolve(data.progressTracker),
    decisionLog: () => Promise.resolve(data.decisionLog),
    decisions: () => Promise.resolve(data.decisions),
    improvements: () => Promise.resolve(data.improvements),
    outbox: () => Promise.resolve({ items: [] }),
    readMarks: () => Promise.resolve({ pages: [] }),
    threadsOfPad: () => Promise.resolve([]),
    onChange: () => () => undefined,
  }
}
