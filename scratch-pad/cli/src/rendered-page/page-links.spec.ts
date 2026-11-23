import { describe, expect, it } from 'vitest'
import { renderedInvoicePage } from './rendered-page-fixtures'

function linksOfLine(line: string) {
  return renderedInvoicePage([line]).links
}

describe('the links of a rendered page', () => {
  it('records the encoded href and the decoded page when a link has a space or an accent', () => {
    const line =
      '[angle](<my queue.md>) [encoded](my%20queue.md) [accent](café.md) [section](caf%C3%A9.md#menu)'
    expect(linksOfLine(line).map((link) => [link.href, 'page' in link && link.page])).toStrictEqual(
      [
        ['my%20queue.md', 'pages/my queue.md'],
        ['my%20queue.md', 'pages/my queue.md'],
        ['caf%C3%A9.md', 'pages/café.md'],
        ['caf%C3%A9.md#menu', 'pages/café.md'],
      ],
    )
  })

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

  it('returns a task link with the id of the task when the agent writes a task reference', () => {
    expect(linksOfLine('See <task:t-4>.')).toStrictEqual([
      { kind: 'task', line: 1, href: 'task:t-4', id: 't-4' },
    ])
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

  it('returns each link inside an agent note with its line on the page when the page has a note', () => {
    const page = renderedInvoicePage([
      'Intro',
      '',
      ':::agent-note',
      "I haven't read [the export job](export-job.md#retry-limit).",
      '',
      'See [the queue](queue.md).',
      ':::',
      '',
      'Then [the tax](#tax).',
    ])

    expect(page.links.map((link) => [link.href, link.line])).toStrictEqual([
      ['export-job.md#retry-limit', 4],
      ['queue.md', 6],
      ['#tax', 9],
    ])
    expect(page.links[0]).toStrictEqual({
      kind: 'page',
      line: 4,
      href: 'export-job.md#retry-limit',
      page: 'pages/export-job.md',
      headingId: 'retry-limit',
    })
  })
})
