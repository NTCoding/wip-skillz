import { describe, expect, it } from 'vitest'
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
  it('prints each heading with its line number padded to the widest number', () => {
    expect(
      outlineText('pages/index.md', [
        { line: 1, level: 1, text: 'Export job' },
        { line: 14, level: 2, text: 'Retry policy' },
      ]),
    ).toBe(' 1  # Export job\n14  ## Retry policy')
  })

  it('prints that the page has no headings when there are none', () => {
    expect(outlineText('pages/notes.md', [])).toBe("pages/notes.md doesn't have any headings")
  })
})

describe('pageListText', () => {
  it('prints one aligned line per page with its title and its open threads', () => {
    expect(
      pageListText([
        { page: 'pages/index.md', title: 'Export job', openThreads: 2 },
        { page: 'pages/retry-policy.md', title: undefined, openThreads: 0 },
        { page: 'pages/limits.md', title: 'Limits', openThreads: 1 },
      ]),
    ).toBe(
      [
        'pages/index.md         Export job  2 open threads',
        'pages/retry-policy.md  (no title)  no open threads',
        'pages/limits.md        Limits      1 open thread',
      ].join('\n'),
    )
  })

  it('prints that there are no pages when the list is empty', () => {
    expect(pageListText([])).toBe("there aren't any pages in pages/ yet")
  })
})
