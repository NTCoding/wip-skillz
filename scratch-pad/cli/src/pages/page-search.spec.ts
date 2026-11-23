import { describe, expect, it } from 'vitest'
import { pageHeadings } from '../rendered-page/rendered-page'
import { searchResultsOf, type SearchedPage } from './page-search'

function searchedPage(lines: readonly string[], title?: string): SearchedPage {
  const markdown = lines.join('\n')
  return { page: 'pages/retry-limit.md', title, markdown, headings: pageHeadings(markdown) }
}

function snippetsOf(lines: readonly string[], query: string) {
  return searchResultsOf([searchedPage(lines)], query).map(({ snippet, matches }) => ({
    snippet,
    matches,
  }))
}

describe('the search of the pages', () => {
  it('shows a match before the first heading under the title of the page without a heading id', () => {
    const page = searchedPage(['The retry limit is 5.', '', '# Retry limit'], 'Retry limit')
    expect(searchResultsOf([page], 'limit is')).toStrictEqual([
      {
        page: 'pages/retry-limit.md',
        heading: 'Retry limit',
        headingId: undefined,
        snippet: 'The retry limit is 5.',
        matches: [{ start: 10, end: 18 }],
      },
    ])
  })

  it('marks every match of the line when the query is twice in one line', () => {
    expect(
      snippetsOf(['Each retry waits twice as long as the retry before it.'], 'RETRY'),
    ).toStrictEqual([
      {
        snippet: 'Each retry waits twice as long as the retry before it.',
        matches: [
          { start: 5, end: 10 },
          { start: 38, end: 43 },
        ],
      },
    ])
  })

  it('starts the snippet at a word before the match with a cut mark when the match is far into the line', () => {
    const line =
      'The export job writes the paid invoices of each shop to a CSV file every night before the retry starts.'
    expect(snippetsOf([line], 'retry')).toStrictEqual([
      {
        snippet: '…to a CSV file every night before the retry starts.',
        matches: [{ start: 38, end: 43 }],
      },
    ])
  })

  it('cuts the snippet inside a word when the word before the match is longer than the cut', () => {
    const line = `${'x'.repeat(60)}retry`
    expect(snippetsOf([line], 'retry')).toStrictEqual([
      { snippet: `…${'x'.repeat(40)}retry`, matches: [{ start: 41, end: 46 }] },
    ])
  })

  it('leaves out the indent of the line when the match is in an indented line of code', () => {
    expect(
      snippetsOf(
        ['```ts', '    return upload(shop, { retries: retryLimit })', '```'],
        'retrylimit',
      ),
    ).toStrictEqual([
      {
        snippet: 'return upload(shop, { retries: retryLimit })',
        matches: [{ start: 31, end: 41 }],
      },
    ])
  })

  it('doesn’t find anything when the query is only whitespace', () => {
    expect(snippetsOf(['The retry limit is 5.'], '  ')).toStrictEqual([])
  })

  it('reads the query as text when it contains the characters of a regular expression', () => {
    expect(snippetsOf(['The limit (8) is new.', 'The limit 8 is old.'], '(8)')).toStrictEqual([
      { snippet: 'The limit (8) is new.', matches: [{ start: 10, end: 13 }] },
    ])
  })

  it('skips the rest of the page when a decision block isn’t closed', () => {
    expect(
      snippetsOf(
        ['## Retry limit', '', ':::decision d-1', 'proposal: Raise the retry limit.'],
        'retry',
      ),
    ).toStrictEqual([{ snippet: '## Retry limit', matches: [{ start: 3, end: 8 }] }])
  })

  it('finds the query in the text after a decision block when the block is closed', () => {
    expect(
      snippetsOf(
        [':::decision d-1', 'proposal: Raise the retry limit.', ':::', 'The retry waits.'],
        'retry',
      ),
    ).toStrictEqual([{ snippet: 'The retry waits.', matches: [{ start: 4, end: 9 }] }])
  })

  it('finds the query in an html block and an agent note when the page has them', () => {
    expect(
      snippetsOf([':::html', '<p>retry</p>', ':::', ':::agent-note', 'A retry.', ':::'], 'retry'),
    ).toStrictEqual([
      { snippet: '<p>retry</p>', matches: [{ start: 3, end: 8 }] },
      { snippet: 'A retry.', matches: [{ start: 2, end: 7 }] },
    ])
  })
})
