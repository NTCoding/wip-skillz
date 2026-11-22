import { describe, expect, it } from 'vitest'
import { invoiceHtml, renderedInvoicePage } from './rendered-page-fixtures'

describe('the named blocks of a rendered page', () => {
  it('reports an unknown block and shows its content under a warning when the block name is unknown', () => {
    const page = renderedInvoicePage([':::chart', 'retries: 5', ':::'])
    const text =
      "there aren't any blocks called :::chart. The blocks are :::decision, :::html and :::agent-note"

    expect(page.problems).toStrictEqual([{ line: 1, text }])
    expect(page.html).toBe(
      [
        '<div class="unknown-block" data-lines="1-3">',
        `<p class="named-block-warning">${text}</p>`,
        '<pre>retries: 5',
        '</pre>',
        '</div>',
        '',
      ].join('\n'),
    )
  })

  it("runs the block to the end of the page when the block isn't closed", () => {
    const page = renderedInvoicePage(['Intro', '', ':::html', '<b>retry</b>', '', ''])

    expect(page.problems).toStrictEqual([
      { line: 3, text: "the :::html block isn't closed with a ::: line" },
    ])
    expect(page.html).toContain('<div class="html-block" data-lines="3-4">')
  })

  it('starts a block straight after a paragraph when there is no blank line between them', () => {
    expect(invoiceHtml(['The steps:', ':::html', '<ol></ol>', ':::'])).toBe(
      [
        '<p data-lines="1-1">The steps:</p>',
        '<div class="html-block" data-lines="2-4">',
        '<ol></ol>',
        '</div>',
        '',
      ].join('\n'),
    )
  })

  it("renders 3 colons as text when a block name doesn't follow the colons", () => {
    expect(invoiceHtml([':::'])).toBe('<p data-lines="1-1">:::</p>\n')
  })

  it("renders an empty block when there aren't any lines inside the block", () => {
    expect(invoiceHtml([':::html', ':::'])).toBe(
      '<div class="html-block" data-lines="1-2">\n</div>\n',
    )
  })
})
