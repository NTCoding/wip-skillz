import { describe, expect, it } from 'vitest'
import { searchedPageOf } from './searched-page'

describe('searchedPageOf', () => {
  it('returns the same searched page when the same Markdown is searched again', () => {
    expect(searchedPageOf('# Export job')).toBe(searchedPageOf('# Export job'))
  })

  it('parses the page again when 8 other pages were searched in between', () => {
    const first = searchedPageOf('# Invoice template')
    Array.from({ length: 8 }, (_, index) => searchedPageOf(`# Page ${index}`))
    expect(searchedPageOf('# Invoice template')).not.toBe(first)
  })
})

describe('SearchedPage', () => {
  const page = searchedPageOf('The job retries 5 times.\n\nThe job retries 8 times a night.')

  it('returns each exact copy with its block when the quote is in 2 blocks', () => {
    expect(page.exactCopies('job retries').map(({ block }) => block.firstLine)).toStrictEqual([
      1, 3,
    ])
  })

  it('returns only the similar text of the blocks that are close enough when the quote changed', () => {
    expect(
      page.similarCopies('retries 8 times a night').map(({ block, found }) => ({
        line: block.firstLine,
        text: block.text.slice(found.start, found.end),
      })),
    ).toStrictEqual([{ line: 3, text: 'retries 8 times a night' }])
  })

  it('returns nothing when the quote is empty', () => {
    expect(page.similarCopies('')).toStrictEqual([])
  })
})
