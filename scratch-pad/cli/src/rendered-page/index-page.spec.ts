import { describe, expect, it } from 'vitest'
import { sectionTexts } from '../read-marks/read-marks'
import { shownHeadings } from './index-page'
import { pageBlocksOf } from './page-blocks'
import { renderPage, type RenderedPage } from './rendered-page'

function renderedIndex(markdown: readonly string[]): RenderedPage {
  return renderPage({
    page: 'pages/index.md',
    markdown: markdown.join('\n'),
    readCustomFile: () => undefined,
  })
}

const introduction = [
  '# Invoice export',
  '',
  'The export job writes the paid invoices of each shop to a CSV file.',
  '',
  '## How the job runs',
  '',
  'The job runs every night.',
  '',
  '### Retries',
  '',
  'The job retries 5 times.',
]

describe('the index page', () => {
  it('shows the title, then the introduction with the headings of index.md one level lower, then the table of contents', () => {
    const page = renderedIndex(introduction)
    expect([page.html.split('\n'), page.headings]).toStrictEqual([
      [
        '<h1 data-lines="1-1" id="invoice-export">Invoice export</h1>',
        '<h2 id="introduction">Introduction</h2>',
        '<p data-lines="3-3">The export job writes the paid invoices of each shop to a CSV file.</p>',
        '<h3 data-lines="5-5" id="how-the-job-runs">How the job runs</h3>',
        '<p data-lines="7-7">The job runs every night.</p>',
        '<h4 data-lines="9-9" id="retries">Retries</h4>',
        '<p data-lines="11-11">The job retries 5 times.</p>',
        '<h2 id="table-of-contents">Table of contents</h2>',
        '',
      ],
      [
        { level: 1, text: 'Invoice export', id: 'invoice-export', line: 1 },
        { level: 2, text: 'Introduction', id: 'introduction', line: 2 },
        { level: 3, text: 'How the job runs', id: 'how-the-job-runs', line: 5 },
        { level: 4, text: 'Retries', id: 'retries', line: 9 },
        { level: 2, text: 'Table of contents', id: 'table-of-contents', line: 12 },
      ],
    ])
  })

  it('keeps the lines and the text of each block of index.md so that a comment is still attached to its text', () => {
    const blocks = pageBlocksOf(introduction.join('\n')).map(
      (block) => `${block.firstLine}-${block.lastLine}`,
    )
    const shownLines = [...renderedIndex(introduction).html.matchAll(/data-lines="([^"]+)"/g)].map(
      (match) => match[1],
    )
    expect(shownLines).toStrictEqual(blocks)
  })

  it('starts with the introduction when index.md doesn’t have a title', () => {
    const page = renderedIndex(['The export job writes one file per shop.'])
    expect(page.html.split('\n').slice(0, 2)).toStrictEqual([
      '<h2 id="introduction">Introduction</h2>',
      '<p data-lines="1-1">The export job writes one file per shop.</p>',
    ])
    expect(page.headings[0]).toStrictEqual({
      level: 2,
      text: 'Introduction',
      id: 'introduction',
      line: 1,
    })
  })

  it('keeps the id of a heading that the agent called Introduction and gives the heading of the server the next free id', () => {
    const page = renderedIndex(['# Invoice export', '', '## Introduction', '', 'The export job.'])
    expect(page.headings.map((heading) => [heading.level, heading.id])).toStrictEqual([
      [1, 'invoice-export'],
      [2, 'introduction-2'],
      [3, 'introduction'],
      [2, 'table-of-contents'],
    ])
  })

  it('shows a second title at level 3 and keeps a heading of level 6 at level 6', () => {
    const page = renderedIndex(['# Invoice export', '', '# Retries', '', '###### Logs'])
    expect(page.headings.map((heading) => heading.level)).toStrictEqual([1, 2, 3, 6, 2])
  })

  it('asks the question of the heading from index.md rather than the heading of the server', () => {
    const page = renderedIndex([
      '# Will the export job retry 8 times?',
      '',
      ':::decision d-1',
      'proposal: Raise the retry limit to 8.',
      'alternative: Keep the retry limit at 5.',
      'pick: proposal',
      ':::',
    ])
    expect(page.decisions.map((decision) => decision.question)).toStrictEqual([
      'Will the export job retry 8 times?',
    ])
  })

  it('shows the pages other than the index page as they are', () => {
    const page = renderPage({
      page: 'pages/retry-limit.md',
      markdown: '# Retry limit\n\n## Wait',
      readCustomFile: () => undefined,
    })
    expect(page.html).toBe(
      '<h1 data-lines="1-1" id="retry-limit">Retry limit</h1>\n<h2 data-lines="3-3" id="wait">Wait</h2>\n',
    )
  })
})

describe('shownHeadings', () => {
  it('returns the headings of a page other than the index page at their own levels', () => {
    const headings = [{ level: 2, text: 'Wait', id: 'wait', line: 3 }]
    expect(shownHeadings('pages/retry-limit.md', headings)).toStrictEqual(headings)
  })

  it('leaves the sections of level 4 on the index page out of the read marks, because the browser shows them at level 4', () => {
    expect(
      sectionTexts(introduction.join('\n'), 'pages/index.md').map((section) => section.id),
    ).toStrictEqual(['how-the-job-runs'])
  })
})
