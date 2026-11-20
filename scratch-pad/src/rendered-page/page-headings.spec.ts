import { describe, expect, it } from 'vitest'
import { pageHeadings } from './rendered-page'
import { invoiceHtml } from './rendered-page-fixtures'

describe('the headings of a rendered page', () => {
  it('adds an id from the text to each heading when the page is rendered', () => {
    expect(invoiceHtml(['## Tax number ##'])).toBe(
      '<h2 data-lines="1-1" id="tax-number">Tax number</h2>\n',
    )
  })

  it('adds a number to the id when 2 headings have the same text', () => {
    expect(
      pageHeadings('## Limits\n\n## Limits\n\n## Limits-2').map((heading) => heading.id),
    ).toStrictEqual(['limits', 'limits-2', 'limits-2-2'])
  })

  it('uses the plain text of the heading when the heading contains code and a link', () => {
    expect(pageHeadings('## The `retry` **limit** of [the job](job.md)')).toStrictEqual([
      { level: 2, text: 'The retry limit of the job', id: 'the-retry-limit-of-the-job', line: 1 },
    ])
  })

  it('calls the heading section when the heading has neither letters nor digits', () => {
    expect(pageHeadings('## 🎯').map((heading) => heading.id)).toStrictEqual(['section'])
  })

  it('reads a heading that is underlined when the page uses the underlined form', () => {
    expect(pageHeadings('Intro\n\nTax number\nof the shop\n---')).toStrictEqual([
      { level: 2, text: 'Tax number of the shop', id: 'tax-number-of-the-shop', line: 3 },
    ])
  })

  it('skips a hash line when the line is in a code block or an html block', () => {
    expect(pageHeadings('```bash\n# retry\n```\n\n:::html\n# retry\n:::')).toStrictEqual([])
  })
})
