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

  it('skips the paragraphs above the title and the paragraphs inside a list or a quote', () => {
    expect(
      pageDescription(
        'Draft.\n\n# Export job\n\n- A bullet point.\n\n> A quote.\n\n## Retry policy\n\nThe job retries 5 times.\n',
      ),
    ).toBe('The job retries 5 times.')
  })

  it("returns the first paragraph when the page doesn't have a title", () => {
    expect(pageDescription('The export job writes one file per shop.\n')).toBe(
      'The export job writes one file per shop.',
    )
  })

  it("returns undefined when the page doesn't have a paragraph after its title", () => {
    expect(pageDescription('# Export job\n\n## Retry policy\n')).toBeUndefined()
  })
})
