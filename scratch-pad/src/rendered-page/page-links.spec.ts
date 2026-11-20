import { describe, expect, it } from 'vitest'
import { renderedInvoicePage } from './rendered-page-fixtures'

function linksOfLine(line: string) {
  return renderedInvoicePage([line]).links
}

describe('the links of a rendered page', () => {
  it('returns the page and the heading id when the link points to a heading on another page', () => {
    expect(linksOfLine('[limits](export-job.md#retry-limit)')).toStrictEqual([
      {
        kind: 'page',
        line: 1,
        href: 'export-job.md#retry-limit',
        page: 'pages/export-job.md',
        headingId: 'retry-limit',
      },
    ])
  })

  it('returns the page itself when the link points to a heading on the same page', () => {
    expect(linksOfLine('[tax](#tax-number)')).toStrictEqual([
      {
        kind: 'page',
        line: 1,
        href: '#tax-number',
        page: 'pages/invoice-template.md',
        headingId: 'tax-number',
      },
    ])
  })

  it('returns the page without a heading id when the link ends with a bare hash', () => {
    expect(linksOfLine('[top](#)')).toStrictEqual([
      {
        kind: 'page',
        line: 1,
        href: '#',
        page: 'pages/invoice-template.md',
        headingId: undefined,
      },
    ])
  })

  it('resolves the path from the pages folder when the link goes up a folder', () => {
    expect(linksOfLine('[job](../pages/export%20job.md)')).toStrictEqual([
      {
        kind: 'page',
        line: 1,
        href: '../pages/export%20job.md',
        page: 'pages/export job.md',
        headingId: undefined,
      },
    ])
  })

  it.each([
    'https://example.com/invoice.md',
    'mailto:billing@example.com',
    '/pages/export-job.md',
    '../custom/retry-steps.html',
  ])('returns another kind of link when the link is %s', (href) => {
    expect(linksOfLine(`[x](${href})`)).toStrictEqual([{ kind: 'other', line: 1, href }])
  })

  it('returns the line of each link when a paragraph has several lines and a hard break', () => {
    const page = renderedInvoicePage([
      'Intro',
      '',
      'See [one](one.md) and',
      'then [two](two.md)  ',
      'and [three](three.md).',
      '',
      '| a | b |',
      '|---|---|',
      '| [four](four.md) | 4 |',
    ])

    expect(page.links.map((link) => link.line)).toStrictEqual([3, 4, 5, 9])
  })
})
