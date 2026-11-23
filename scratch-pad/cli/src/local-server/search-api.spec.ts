import { afterEach, describe, expect, it } from 'vitest'
import { retryQuestion, writeInvoiceDecisionsPage } from '../nick-views/nick-views-fixtures'
import {
  exportJobPadName,
  exportJobScratchPad,
  removeTemporaryHomes,
  temporaryHome,
  writeFileInPad,
} from '../scratch-pad-folder/scratch-pad-folder-fixtures'
import { type ScratchPadFolder } from '../scratch-pad-folder/scratch-pad-folder'
import { respondToApiRequest } from './scratch-pad-api'

const padApi = `/api/scratch-pads/${exportJobPadName}`

afterEach(() => {
  removeTemporaryHomes()
})

function searchedPad(): { readonly home: string; readonly folder: ScratchPadFolder } {
  const home = temporaryHome()
  const folder = exportJobScratchPad(home)
  writeInvoiceDecisionsPage(folder)
  return { home, folder }
}

function search(home: string, path: string): unknown {
  const response = respondToApiRequest({ home, method: 'GET', path: `${padApi}${path}`, body: '' })
  return response.kind === 'json' ? response.body : response.kind
}

describe('respondToApiRequest for the search', () => {
  const retryLimitPage = ['# Retry limit', '', 'The RETRY limit of the export job is 5.', ''].join(
    '\n',
  )

  function homeWithRetryLimit(): string {
    const { home, folder } = searchedPad()
    writeFileInPad(folder, 'pages/1-retry-limit.md', retryLimitPage)
    return home
  }

  it('returns each line with the query in the order of the pages in the sidebar and of the lines when Nick searches', () => {
    expect(search(homeWithRetryLimit(), '/search?query=Retry')).toStrictEqual({
      results: [
        {
          page: 'pages/index.md',
          heading: 'Retry policy',
          headingId: 'retry-policy',
          snippet: '## Retry policy',
          matches: [{ start: 3, end: 8 }],
        },
        {
          page: 'pages/index.md',
          heading: 'Retry policy',
          headingId: 'retry-policy',
          snippet: 'Each retry waits 30 seconds.',
          matches: [{ start: 5, end: 10 }],
        },
        {
          page: 'pages/retry-limit.md',
          heading: 'Retry limit',
          headingId: 'retry-limit',
          snippet: '# Retry limit',
          matches: [{ start: 2, end: 7 }],
        },
        {
          page: 'pages/retry-limit.md',
          heading: 'Retry limit',
          headingId: 'retry-limit',
          snippet: 'The RETRY limit of the export job is 5.',
          matches: [{ start: 4, end: 9 }],
        },
        {
          page: 'pages/invoice-decisions.md',
          heading: retryQuestion,
          headingId: 'will-the-export-job-retry-8-times',
          snippet: `## ${retryQuestion}`,
          matches: [{ start: 23, end: 28 }],
        },
      ],
    })
  })

  it('skips the decision blocks when the query is only in the options of a decision', () => {
    expect(search(homeWithRetryLimit(), '/search?query=keep%20the%20retry%20limit')).toStrictEqual({
      results: [],
    })
  })

  it.each(['/search?query=', '/search?query=%20%20', '/search'])(
    'returns no results when the query is empty, only whitespace or missing in %s',
    (path) => {
      expect(search(homeWithRetryLimit(), path)).toStrictEqual({ results: [] })
    },
  )

  it('finds the query in the address of a link when the text of the link is different', () => {
    const { home, folder } = searchedPad()
    writeFileInPad(folder, 'pages/index.md', '# Export job\n\nThe [limit](retry-limit.md) is 5.\n')

    expect(search(home, '/search?query=limit.md')).toStrictEqual({
      results: [
        {
          page: 'pages/index.md',
          heading: 'Introduction',
          headingId: 'introduction',
          snippet: 'The [limit](retry-limit.md) is 5.',
          matches: [{ start: 18, end: 26 }],
        },
      ],
    })
  })
})
