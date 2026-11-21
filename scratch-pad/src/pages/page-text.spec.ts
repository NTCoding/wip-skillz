import { describe, expect, it } from 'vitest'
import {
  exportJobAddress,
  missingLinksText,
  servedLinks,
  unservedLinks,
} from '../item-links/item-links-fixtures'
import { numberedLines, outlineText, pageListText } from './page-text'

describe('numberedLines', () => {
  it('numbers the lines and pads the numbers to the width of the last number', () => {
    const lines = Array.from({ length: 12 }, (_, index) => `line ${index + 1}`)

    expect(numberedLines(lines, 9, 10)).toStrictEqual(['     9 | line 9', '    10 | line 10'])
  })

  it('leaves no trailing space after the bar when a line is empty', () => {
    expect(numberedLines(['a', ''], 1, 2)).toStrictEqual(['    1 | a', '    2 |'])
  })

  it('returns only the lines that exist when the range goes past the end', () => {
    expect(numberedLines(['a', 'b'], 2, 5)).toStrictEqual(['    2 | b'])
  })
})

describe('outlineText', () => {
  const headings = [
    { line: 1, level: 1, text: 'Export job', id: 'export-job' },
    { line: 14, level: 2, text: 'Retry policy', id: 'retry-policy' },
  ]

  it('prints each heading with its line number padded to the widest number and its link', () => {
    expect(outlineText('pages/index.md', headings, servedLinks)).toBe(
      [
        ` 1  # Export job  ${exportJobAddress}#export-job`,
        `14  ## Retry policy  ${exportJobAddress}#retry-policy`,
      ].join('\n'),
    )
  })

  it("prints that there aren't any links after the headings when the server isn't running", () => {
    expect(outlineText('pages/index.md', headings, unservedLinks)).toBe(
      [' 1  # Export job', '14  ## Retry policy', missingLinksText].join('\n'),
    )
  })

  it('prints that the page has no headings when there are none', () => {
    expect(outlineText('pages/notes.md', [], servedLinks)).toBe(
      "pages/notes.md doesn't have any headings",
    )
  })
})

describe('pageListText', () => {
  const pages = [
    { page: 'pages/index.md', title: 'Export job', openThreads: 2 },
    { page: 'pages/retry-policy.md', title: undefined, openThreads: 0 },
    { page: 'pages/limits.md', title: 'Limits', openThreads: 1 },
  ]

  it('prints one aligned line per page with its title, its open threads and its link', () => {
    expect(pageListText(pages, servedLinks)).toBe(
      [
        `pages/index.md         Export job  2 open threads   ${exportJobAddress}`,
        `pages/retry-policy.md  (no title)  no open threads  ${exportJobAddress}retry-policy.md`,
        `pages/limits.md        Limits      1 open thread    ${exportJobAddress}limits.md`,
      ].join('\n'),
    )
  })

  it("prints that there aren't any links after the pages when the server isn't running", () => {
    expect(pageListText(pages, unservedLinks)).toBe(
      [
        'pages/index.md         Export job  2 open threads',
        'pages/retry-policy.md  (no title)  no open threads',
        'pages/limits.md        Limits      1 open thread',
        missingLinksText,
      ].join('\n'),
    )
  })

  it('prints that there are no pages when the list is empty', () => {
    expect(pageListText([], servedLinks)).toBe("there aren't any pages in pages/ yet")
  })
})
