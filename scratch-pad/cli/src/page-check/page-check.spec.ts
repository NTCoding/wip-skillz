import { describe, expect, it } from 'vitest'
import { pageFileOf } from '../pages/page-files'
import { renderPage } from '../rendered-page/rendered-page'
import { pageCheckProblems, type CheckedPage } from './page-check'

function checkedPage(file: string, markdown: readonly string[]): CheckedPage {
  const { page } = pageFileOf(file)
  return {
    page,
    file,
    rendered: renderPage({ page, markdown: markdown.join('\n'), readCustomFile: () => undefined }),
  }
}

const exportJob = checkedPage('pages/export-job.md', ['# Export job', '', '## Retry limit'])

function problemsOfInvoicePage(markdown: readonly string[], answeredDecisions: string[] = []) {
  const pages = [checkedPage('pages/invoice-template.md', markdown), exportJob]
  return pageCheckProblems(
    pages,
    [],
    ['pages/invoice-template.md'],
    answeredDecisions,
    ['t-1', 't-4'],
    () => [],
  )
}

const decision = (id: string): string[] => [
  '## Will the export job retry 8 times?',
  '',
  `:::decision ${id}`,
  'context: A slow network can make an upload fail.',
  'proposal: a',
  'alternative: b',
  'pick: a',
  ':::',
]

describe('pageCheckProblems', () => {
  it("doesn't report a task reference whose id is on the progress tracker", () => {
    expect(problemsOfInvoicePage(['Intro', '', 'This is part of <task:t-4>.'])).toStrictEqual([])
  })

  it("reports a task reference whose id isn't on the progress tracker", () => {
    expect(problemsOfInvoicePage(['Intro', '', 'See <task:t-9>.'])).toStrictEqual([
      {
        page: 'pages/invoice-template.md',
        line: 3,
        text: "the task reference <task:t-9> points to t-9, which isn't a task or a subtask on the progress tracker. Run tasks to list the ids",
      },
    ])
  })

  it("reports a task reference that doesn't have the id of a task", () => {
    expect(problemsOfInvoicePage(['See <task:4>.'])).toStrictEqual([
      {
        page: 'pages/invoice-template.md',
        line: 1,
        text: "<task:4> isn't a task reference. Write the id of the task or the subtask, like <task:t-4>",
      },
    ])
  })

  it("reports the link when the link points to a page that doesn't exist", () => {
    expect(problemsOfInvoicePage(['Intro', '', 'See [the queue](queue.md).'])).toStrictEqual([
      {
        page: 'pages/invoice-template.md',
        line: 3,
        text: "the link points to pages/queue.md, which doesn't exist",
      },
    ])
  })

  it("reports the link when a link inside an agent note points to a page that doesn't exist", () => {
    expect(
      problemsOfInvoicePage([
        'Intro',
        '',
        ':::agent-note',
        'I skipped [the queue](queue.md).',
        ':::',
      ]),
    ).toStrictEqual([
      {
        page: 'pages/invoice-template.md',
        line: 4,
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

  it('accepts the link when the link points to a heading in a script other than Latin', () => {
    expect(
      problemsOfInvoicePage(['## Налоговый номер', '', '[tax](#налоговый-номер)']),
    ).toStrictEqual([])
  })

  it('reports the second decision with the line of the first when a page uses a decision id twice', () => {
    expect(problemsOfInvoicePage([...decision('d-2'), '', ...decision('d-2')])).toStrictEqual([
      {
        page: 'pages/invoice-template.md',
        line: 12,
        text: 'decision d-2 is used twice (first on line 3)',
      },
    ])
  })

  it("reports the decision when the decision doesn't have a context", () => {
    expect(
      problemsOfInvoicePage([
        '## Will the export job retry 8 times?',
        '',
        ':::decision d-2',
        'proposal: a',
        'alternative: b',
        'pick: a',
        ':::',
      ]),
    ).toStrictEqual([
      {
        page: 'pages/invoice-template.md',
        line: 3,
        text: "decision d-2 doesn't have a context (write one on the context: line)",
      },
    ])
  })

  it('reports the decision when the context: line of the decision is empty', () => {
    expect(
      problemsOfInvoicePage([
        '## Will the export job retry 8 times?',
        '',
        ':::decision d-2',
        'context:',
        'proposal: a',
        'alternative: b',
        'pick: a',
        ':::',
      ]),
    ).toStrictEqual([
      {
        page: 'pages/invoice-template.md',
        line: 3,
        text: "decision d-2 doesn't have a context (write one on the context: line)",
      },
    ])
  })

  it("doesn't report a decision without a context when Nick has already answered the decision", () => {
    expect(
      problemsOfInvoicePage(
        [
          '## Will the export job retry 8 times?',
          '',
          ':::decision d-2',
          'proposal: a',
          'alternative: b',
          'pick: a',
          ':::',
        ],
        ['d-2'],
      ),
    ).toStrictEqual([])
  })

  it("reports the link when a link in the context of a decision points to a heading that doesn't exist", () => {
    expect(
      problemsOfInvoicePage([
        '## Will the export job retry 8 times?',
        '',
        ':::decision d-2',
        'context: A slow network can make an upload fail. Read these in order:',
        '  1. [The retry limit](export-job.md#retry-limit) explains the limit of today.',
        '  2. [The queue](export-job.md#the-queue) shows where the upload waits.',
        'proposal: a',
        'alternative: b',
        'pick: a',
        ':::',
      ]),
    ).toStrictEqual([
      {
        page: 'pages/invoice-template.md',
        line: 6,
        text: "the link points to the heading #the-queue in pages/export-job.md, which doesn't exist",
      },
    ])
  })

  it('reports the decision with the page of the first when another page uses the decision id first', () => {
    const pages = [
      checkedPage('pages/export-job.md', decision('d-2')),
      checkedPage('pages/invoice-template.md', ['Intro', '', ...decision('d-2')]),
    ]

    expect(
      pageCheckProblems(pages, [], ['pages/invoice-template.md'], [], [], () => []),
    ).toStrictEqual([
      {
        page: 'pages/invoice-template.md',
        line: 5,
        text: 'decision d-2 is used twice (first on pages/export-job.md:3)',
      },
    ])
  })

  it('reports the problems of the checked pages only when one page is checked', () => {
    const pages = [
      checkedPage('pages/export-job.md', ['[queue](queue.md)']),
      checkedPage('pages/invoice-template.md', [':::chart', ':::']),
    ]

    expect(
      pageCheckProblems(pages, [], ['pages/invoice-template.md'], [], [], () => []).map(
        (problem) => problem.page,
      ),
    ).toStrictEqual(['pages/invoice-template.md'])
  })

  it('reports the problems of each page in the order of their lines and then the prose problems when there are both', () => {
    const pages = [
      checkedPage('pages/invoice-template.md', ['[queue](queue.md)', '', ':::chart', ':::']),
    ]

    expect(
      pageCheckProblems(pages, [], ['pages/invoice-template.md'], [], [], (checked) => [
        `${checked.file} is too long`,
      ]).map((problem) => problem.line),
    ).toStrictEqual([1, 3, undefined])
  })
})

describe('pageCheckProblems on the numbers of the pages', () => {
  function problemsOfFiles(
    files: readonly string[],
    markdowns: Readonly<Record<string, string[]>> = {},
  ) {
    const pageFiles = files.map(pageFileOf)
    const pages = pageFiles
      .filter((file, index) => pageFiles.findIndex((other) => other.page === file.page) === index)
      .map((file) => checkedPage(file.file, markdowns[file.file] ?? ['# Page']))
    return pageCheckProblems(
      pages,
      pageFiles,
      pages.map((page) => page.page),
      [],
      [],
      () => [],
    )
  }

  it("doesn't report anything when every page except the index page has a number and every sub page has its parent", () => {
    expect(
      problemsOfFiles([
        'pages/index.md',
        'pages/1-comment-on-the-export.md',
        'pages/1.1-evidence.md',
        'pages/1.1.1-raw-logs.md',
        'pages/2-board-edge.md',
      ]),
    ).toStrictEqual([])
  })

  it("reports the page when a page other than the index page doesn't have a number", () => {
    expect(problemsOfFiles(['pages/index.md', 'pages/notes.md'])).toStrictEqual([
      {
        page: 'pages/notes.md',
        line: undefined,
        text: "the page doesn't have a number. Rename the file to <number>-notes.md, where the number is the place of the page in the order",
      },
    ])
  })

  it('reports the second file when 2 files have the same name after their numbers', () => {
    expect(problemsOfFiles(['pages/1-evidence.md', 'pages/2-evidence.md'])).toStrictEqual([
      {
        page: 'pages/2-evidence.md',
        line: undefined,
        text: 'the page has the same name as pages/1-evidence.md after its number. Give one of the 2 pages another name',
      },
    ])
  })

  it('reports the page when its number has a leading zero and gives the sub page the parent without the zero', () => {
    expect(problemsOfFiles(['pages/01-m.md', 'pages/1.1-y.md'])).toStrictEqual([
      {
        page: 'pages/01-m.md',
        line: undefined,
        text: "the number of the page has a leading zero. Write the number as 1 so that it's read the same way everywhere",
      },
    ])
  })

  it('reports the second file when 2 files have the same number', () => {
    expect(problemsOfFiles(['pages/2-a.md', 'pages/2-b.md'])).toStrictEqual([
      {
        page: 'pages/2-b.md',
        line: undefined,
        text: 'the page has the same number 2 as pages/2-a.md. Give one of the 2 pages another number',
      },
    ])
  })

  it("reports the sub page when the page of its parent number doesn't exist", () => {
    expect(problemsOfFiles(['pages/1-comment.md', 'pages/2.1-x.md'])).toStrictEqual([
      {
        page: 'pages/2.1-x.md',
        line: undefined,
        text: "the page is a sub page of page 2, which doesn't exist. Add a page 2-<name>.md or change the number of this page",
      },
    ])
  })

  it('reports the link when a link between pages includes the number of the page', () => {
    const markdowns = {
      'pages/1-comment.md': ['# Comment', '', 'See [the evidence](1.1-evidence.md).'],
    }

    expect(
      problemsOfFiles(['pages/1-comment.md', 'pages/1.1-evidence.md'], markdowns),
    ).toStrictEqual([
      {
        page: 'pages/1-comment.md',
        line: 3,
        text: 'the link includes the number 1.1 of the page. Write the link as evidence.md so that it still works after the page is renumbered',
      },
    ])
  })

  it('accepts the link when a link between pages is written without the number', () => {
    const markdowns = {
      'pages/1-comment.md': ['# Comment', '', 'See [the evidence](evidence.md#raw-logs).'],
      'pages/1.1-evidence.md': ['# Evidence', '', '## Raw logs'],
    }

    expect(
      problemsOfFiles(['pages/1-comment.md', 'pages/1.1-evidence.md'], markdowns),
    ).toStrictEqual([])
  })

  it("reports the link as a missing page when the link includes a number and the page without the number doesn't exist", () => {
    const markdowns = { 'pages/1-comment.md': ['[the queue](3-queue.md)'] }

    expect(problemsOfFiles(['pages/1-comment.md'], markdowns)[0]?.text).toBe(
      "the link points to pages/3-queue.md, which doesn't exist",
    )
  })
})

describe('pageCheckProblems on html blocks', () => {
  it('reports the raw colours when an html block of the page contains raw colours', () => {
    expect(
      problemsOfInvoicePage([
        '# Invoice template',
        '',
        ':::html',
        '<p style="color:#ff0000;background:rgb(0 0 0)">red</p>',
        ':::',
      ]),
    ).toStrictEqual([
      {
        page: 'pages/invoice-template.md',
        line: 3,
        text: 'the :::html block uses the raw colours #ff0000, rgb(0 0 0). Use a design token like var(--accent) instead',
      },
    ])
  })

  it('reports the raw colour in the singular when an html block contains one raw colour', () => {
    expect(
      problemsOfInvoicePage([':::html', '<p style="color:red">Total</p>', ':::'])[0]?.text,
    ).toBe(
      'the :::html block uses the raw colour red. Use a design token like var(--accent) instead',
    )
  })

  it("doesn't report anything when the html block only uses tokens", () => {
    expect(
      problemsOfInvoicePage([':::html', '<p style="color:var(--accent)">Total</p>', ':::']),
    ).toStrictEqual([])
  })
})
