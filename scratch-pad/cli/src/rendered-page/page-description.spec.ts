import { describe, expect, it } from 'vitest'
import { pageDescription } from './page-description'

describe('pageDescription', () => {
  it('returns the first sentence of the first paragraph after the title', () => {
    expect(
      pageDescription(
        '# Export job\n\nThe export job writes one file per shop. It runs every night.\n',
      ),
    ).toBe('The export job writes one file per shop.')
  })

  it('returns the sentence as plain text without the Markdown markup', () => {
    expect(
      pageDescription(
        '# Export job\n\nThe *export job* writes `invoices.csv` for [each shop](shops.md)\nevery night!\n',
      ),
    ).toBe('The export job writes invoices.csv for each shop every night!')
  })

  it('returns the whole paragraph when the paragraph has only one sentence without a full stop', () => {
    expect(pageDescription('# Export job\n\nThe export job writes one file per shop\n')).toBe(
      'The export job writes one file per shop',
    )
  })

  it('keeps a full stop that is inside a word, such as the dot of a file name', () => {
    expect(
      pageDescription('# Export job\n\nThe job writes export.csv each night. Then it ends.'),
    ).toBe('The job writes export.csv each night.')
  })

  it('skips a paragraph above the title', () => {
    expect(pageDescription('Draft.\n\n# Export job\n\nThe job retries 5 times.\n')).toBe(
      'The job retries 5 times.',
    )
  })

  it.each([
    ['a list', '# Export job\n\n- A bullet point.\n\nThe job retries 5 times.\n'],
    ['a quote', '# Export job\n\n> A quote.\n\nThe job retries 5 times.\n'],
    ['a heading', '# Export job\n\n## Retry policy\n\nThe job retries 5 times.\n'],
    [
      'a decision block',
      '# Export job\n\n:::decision d-1\nproposal: a\nalternative: b\npick: a\n:::\n\nThe job retries 5 times.\n',
    ],
  ])('returns undefined when the first block after the title is %s', (_block, markdown) => {
    expect(pageDescription(markdown)).toBeUndefined()
  })

  it('ignores a full stop inside inline code', () => {
    expect(pageDescription('# Export job\n\nRun `make. all` first. Then wait.\n')).toBe(
      'Run make. all first.',
    )
  })

  it('ignores a full stop inside the text of a link', () => {
    expect(pageDescription('# Export job\n\nSee [v. 2 notes](notes.md) here. Then wait.\n')).toBe(
      'See v. 2 notes here.',
    )
  })

  it('ends the sentence at a full stop inside emphasis', () => {
    expect(pageDescription('# Export job\n\nThe job is **slow.** It waits.\n')).toBe(
      'The job is slow.',
    )
  })

  it('puts a space between the 2 words of a hard line break', () => {
    expect(pageDescription('# Export job\n\nThe job runs\\\nevery night.\n')).toBe(
      'The job runs every night.',
    )
  })

  it("returns the first paragraph when the page doesn't have a title", () => {
    expect(pageDescription('The export job writes one file per shop.\n')).toBe(
      'The export job writes one file per shop.',
    )
  })

  it("returns undefined when the page doesn't have anything after its title", () => {
    expect(pageDescription('# Export job\n')).toBeUndefined()
  })

  it("returns undefined when the page doesn't have a paragraph after its title", () => {
    expect(pageDescription('# Export job\n\n## Retry policy\n')).toBeUndefined()
  })
})
