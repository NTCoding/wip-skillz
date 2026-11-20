import { describe, expect, it } from 'vitest'
import { renderPage } from '../rendered-page/rendered-page'
import { pageCheckProblems, type CheckedPage } from './page-check'

function checkedPage(page: string, markdown: readonly string[]): CheckedPage {
  return {
    page,
    rendered: renderPage({ page, markdown: markdown.join('\n'), readCustomFile: () => undefined }),
  }
}

const exportJob = checkedPage('pages/export-job.md', ['# Export job', '', '## Retry limit'])

function problemsOfInvoicePage(markdown: readonly string[]) {
  const pages = [checkedPage('pages/invoice-template.md', markdown), exportJob]
  return pageCheckProblems(pages, ['pages/invoice-template.md'], () => [])
}

const decision = (id: string): string[] => [
  `:::decision ${id}`,
  'proposal: a',
  'alternative: b',
  'pick: a',
  ':::',
]

describe('pageCheckProblems', () => {
  it("reports the link when the link points to a page that doesn't exist", () => {
    expect(problemsOfInvoicePage(['Intro', '', 'See [the queue](queue.md).'])).toStrictEqual([
      {
        page: 'pages/invoice-template.md',
        line: 3,
        text: "the link points to pages/queue.md, which doesn't exist",
      },
    ])
  })

  it("reports the link when the link points to a heading id that isn't on the target page", () => {
    expect(problemsOfInvoicePage(['[limit](export-job.md#retry-limits)'])).toStrictEqual([
      {
        page: 'pages/invoice-template.md',
        line: 1,
        text: "the link points to the heading #retry-limits in pages/export-job.md, which doesn't exist",
      },
    ])
  })

  it('accepts the links when the pages and the headings exist', () => {
    expect(
      problemsOfInvoicePage([
        '# Tax',
        '',
        '[limit](export-job.md#retry-limit) [job](export-job.md) [tax](#tax) [web](https://example.com)',
      ]),
    ).toStrictEqual([])
  })

  it('reports the second decision with the line of the first when a page uses a decision id twice', () => {
    expect(problemsOfInvoicePage([...decision('d-2'), '', ...decision('d-2')])).toStrictEqual([
      {
        page: 'pages/invoice-template.md',
        line: 7,
        text: 'decision d-2 is used twice (first on line 1)',
      },
    ])
  })

  it('reports the decision with the page of the first when another page uses the decision id first', () => {
    const pages = [
      checkedPage('pages/export-job.md', decision('d-2')),
      checkedPage('pages/invoice-template.md', ['Intro', '', ...decision('d-2')]),
    ]

    expect(pageCheckProblems(pages, ['pages/invoice-template.md'], () => [])).toStrictEqual([
      {
        page: 'pages/invoice-template.md',
        line: 3,
        text: 'decision d-2 is used twice (first on pages/export-job.md:1)',
      },
    ])
  })

  it('reports the problems of the checked pages only when one page is checked', () => {
    const pages = [
      checkedPage('pages/export-job.md', ['[queue](queue.md)']),
      checkedPage('pages/invoice-template.md', [':::chart', ':::']),
    ]

    expect(
      pageCheckProblems(pages, ['pages/invoice-template.md'], () => []).map(
        (problem) => problem.page,
      ),
    ).toStrictEqual(['pages/invoice-template.md'])
  })

  it('reports the problems of each page in the order of their lines and then the prose problems when there are both', () => {
    const pages = [
      checkedPage('pages/invoice-template.md', ['[queue](queue.md)', '', ':::chart', ':::']),
    ]

    expect(
      pageCheckProblems(pages, ['pages/invoice-template.md'], (page) => [
        `${page} is too long`,
      ]).map((problem) => problem.line),
    ).toStrictEqual([1, 3, undefined])
  })
})
