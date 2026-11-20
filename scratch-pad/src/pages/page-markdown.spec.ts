import { describe, expect, it } from 'vitest'
import {
  UnknownPageError,
  findPage,
  isPagePath,
  pageHeadings,
  pagesInOrder,
  pageTitle,
  sectionAt,
} from './page-markdown'

const page = [
  '# Export job',
  '',
  '## Retry policy',
  '',
  '```bash',
  '# not a heading',
  '```',
  '### Limits ##',
  'text',
]

describe('pageHeadings', () => {
  it('returns the headings with their lines and levels', () => {
    expect(pageHeadings(['# Export job', '', '## Retry policy', '### Limits ##'])).toStrictEqual([
      { line: 1, level: 1, text: 'Export job' },
      { line: 3, level: 2, text: 'Retry policy' },
      { line: 4, level: 3, text: 'Limits' },
    ])
  })

  it('skips the lines in a fence', () => {
    expect(pageHeadings(page).map((heading) => heading.text)).toStrictEqual([
      'Export job',
      'Retry policy',
      'Limits',
    ])
  })

  it('ignores a hash without a space after it', () => {
    expect(pageHeadings(['#hashtag', '####### seven'])).toStrictEqual([])
  })
})

describe('pageTitle', () => {
  it('returns the first level 1 heading', () => {
    expect(pageTitle(['## Intro', '# Invoice template'])).toBe('Invoice template')
  })

  it('returns undefined when there is no level 1 heading', () => {
    expect(pageTitle(['## Intro'])).toBeUndefined()
  })
})

describe('sectionAt', () => {
  it('returns the nearest heading at or above the line', () => {
    expect(sectionAt(page, 6)).toBe('Retry policy')
  })

  it('returns undefined when there is no heading above the line', () => {
    expect(sectionAt(['text', '# Title'], 1)).toBeUndefined()
  })
})

describe('isPagePath', () => {
  it.each([
    ['pages/index.md', true],
    ['pages/retry-policy.md', true],
    ['pages/../progress-tracker.json', false],
    ['pages/sub/page.md', false],
    ['index.md', false],
  ])('returns %s for %s', (path, expected) => {
    expect(isPagePath(path)).toBe(expected)
  })
})

describe('findPage', () => {
  const pages = ['pages/index.md', 'pages/retry-policy.md']

  it.each(['pages/retry-policy.md', 'retry-policy.md', 'retry-policy'])(
    'finds the page when it is requested as %s',
    (requested) => {
      expect(findPage(pages, requested, '2026-03-14-export-job')).toBe('pages/retry-policy.md')
    },
  )

  it('throws UnknownPageError that lists the pages in page order when the page does not exist', () => {
    const find = () => findPage(pages.toReversed(), 'invoice', '2026-03-14-export-job')

    expect(find).toThrow(UnknownPageError)
    expect(find).toThrow(
      "There isn't any page called invoice in 2026-03-14-export-job. The pages are: pages/index.md, pages/retry-policy.md",
    )
  })
})

describe('pagesInOrder', () => {
  it('lists the index page first and the other pages in alphabetical order', () => {
    expect(pagesInOrder(['pages/retry.md', 'pages/index.md', 'pages/audit.md'])).toStrictEqual([
      'pages/index.md',
      'pages/audit.md',
      'pages/retry.md',
    ])
  })
})
