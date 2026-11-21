import { describe, expect, it } from 'vitest'
import { indexPage, invoiceTemplatePage } from './browser-page-fixtures'
import { pagePreview } from './page-preview'

describe('pagePreview', () => {
  it('returns the title and the text of the page without its title when no section is given', () => {
    expect(pagePreview(invoiceTemplatePage, 'Invoice export', undefined)).toStrictEqual({
      title: 'Invoice template',
      path: 'Invoice export / Invoice template',
      paragraphs: [
        { text: 'Each invoice shows the tax number of the shop.', heading: false },
        { text: 'Tax number', heading: true },
        { text: 'A guest without a company doesn’t have a tax number.', heading: false },
        { text: 'A company shows its number.', heading: false },
        { text: 'Layout', heading: true },
        { text: 'Each invoice has one page.', heading: false },
      ],
    })
  })

  it('returns the text of the section up to the next section when a section is given', () => {
    expect(pagePreview(invoiceTemplatePage, 'Invoice export', 'tax-number')).toStrictEqual({
      title: 'Tax number',
      path: 'Invoice export / Invoice template',
      paragraphs: [
        { text: 'A guest without a company doesn’t have a tax number.', heading: false },
        { text: 'A company shows its number.', heading: false },
      ],
    })
  })

  it('returns the rest of the page when the section is the last one', () => {
    expect(pagePreview(invoiceTemplatePage, 'Invoice export', 'layout').paragraphs).toStrictEqual([
      { text: 'Each invoice has one page.', heading: false },
    ])
  })

  it('uses the file as the title when the page doesn’t have a title', () => {
    const preview = pagePreview({ ...indexPage, title: undefined }, 'Invoice export', 'unknown')
    expect(preview.title).toBe('index.md')
    expect(preview.path).toBe('Invoice export / index.md')
  })

  it('stops after 460 characters when the page is long', () => {
    const sentence = 'The export job writes one CSV file for each shop every night. '.repeat(4)
    const html = Array.from({ length: 5 }, () => `<p>${sentence}</p>`).join('\n')
    const preview = pagePreview({ ...invoiceTemplatePage, html }, 'Invoice export', undefined)
    expect(preview.paragraphs).toHaveLength(2)
  })

  it('stops after 7 paragraphs when the paragraphs are short', () => {
    const html = Array.from({ length: 9 }, (_, index) => `<p>Shop ${index}</p><p> </p>`).join('')
    const preview = pagePreview({ ...invoiceTemplatePage, html }, 'Invoice export', undefined)
    expect(preview.paragraphs).toHaveLength(7)
  })
})
