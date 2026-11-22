import { describe, expect, it } from 'vitest'
import { findSection, pageReadState, sectionTexts, UnknownSectionError } from './read-marks'

const retryPage = [
  '# Retry limit',
  '',
  'The export job retries the upload of the invoices.',
  '',
  '## The default',
  '',
  'The job retries 5 times.',
  '',
  '#### A note on the wait',
  '',
  'Each retry waits 30 seconds.',
  '',
  '### Slow networks',
  '',
  'A slow network gets 8 retries.',
  '',
  '# Another title',
  '',
  'This text isn’t in any section.',
].join('\n')

function hashesOf(markdown: string): Record<string, string> {
  return Object.fromEntries(sectionTexts(markdown).map((section) => [section.id, section.hash]))
}

describe('sectionTexts', () => {
  it('returns each heading of level 2 or 3 with its title and the hash of its text', () => {
    expect(
      sectionTexts(retryPage).map((section) => [section.id, section.title, section.hash.length]),
    ).toStrictEqual([
      ['the-default', 'The default', 64],
      ['slow-networks', 'Slow networks', 64],
    ])
  })

  it('changes the hash of a section when a line under a heading of level 4 in that section changes', () => {
    const changed = retryPage.replace('30 seconds', '60 seconds')

    expect(hashesOf(changed)['the-default']).not.toBe(hashesOf(retryPage)['the-default'])
    expect(hashesOf(changed)['slow-networks']).toBe(hashesOf(retryPage)['slow-networks'])
  })

  it('ends a section before the next heading of level 1', () => {
    const changed = retryPage.replace('isn’t in any section', 'is still outside the sections')

    expect(hashesOf(changed)).toStrictEqual(hashesOf(retryPage))
  })

  it('keeps the hash of a section when only the blank lines around it change', () => {
    expect(hashesOf(retryPage.replace('8 retries.\n', '8 retries.\n\n\n'))).toStrictEqual(
      hashesOf(retryPage),
    )
  })

  it('ends the last section at the end of the page', () => {
    const page = '# Retry limit\n\n## Slow networks\n\nA slow network gets 8 retries.'

    expect(hashesOf(page.replace('8', '9'))['slow-networks']).not.toBe(
      hashesOf(page)['slow-networks'],
    )
  })
})

describe('findSection', () => {
  it('returns the section with the id', () => {
    expect(
      findSection(sectionTexts(retryPage), 'slow-networks', 'pages/retry-limit.md').title,
    ).toBe('Slow networks')
  })

  it("throws UnknownSectionError when the page doesn't have the section", () => {
    expect(() => findSection(sectionTexts(retryPage), 'the-logo', 'pages/retry-limit.md')).toThrow(
      UnknownSectionError,
    )
  })
})

describe('pageReadState', () => {
  const page = 'pages/retry-limit.md'
  const sections = sectionTexts(retryPage)
  const readSections = sections.map((section) => ({
    page,
    section: section.id,
    hash: section.hash,
  }))

  it("returns new when Nick hasn't read the page", () => {
    expect(pageReadState(page, sections, { pages: [], sections: readSections })).toStrictEqual({
      kind: 'new',
    })
  })

  it('returns read without any changed sections when every section has the text that Nick read', () => {
    expect(pageReadState(page, sections, { pages: [page], sections: readSections })).toStrictEqual({
      kind: 'read',
      changedSections: [],
    })
  })

  it("returns the sections whose text has changed and the sections that weren't there when Nick read the page", () => {
    const changed = sectionTexts(`${retryPage.replace('5 times', '6 times')}\n\n## The logo\n\nA.`)
    const marks = {
      pages: [page],
      sections: [...readSections, { page: 'pages/index.md', section: 'the-logo', hash: 'x' }],
    }

    expect(pageReadState(page, changed, marks)).toMatchObject({
      kind: 'read',
      changedSections: [{ id: 'the-default' }, { id: 'the-logo' }],
    })
  })
})
