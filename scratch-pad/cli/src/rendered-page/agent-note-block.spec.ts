import { describe, expect, it } from 'vitest'
import { pageBlocksOf } from './page-blocks'
import { renderedInvoicePage } from './rendered-page-fixtures'

describe('the agent-note block of a rendered page', () => {
  it('renders the inline Markdown of the note when the note has one paragraph', () => {
    const page = renderedInvoicePage([
      ':::agent-note',
      "I haven't read the code of the **export job**.",
      ':::',
    ])

    expect(page.problems).toStrictEqual([])
    expect(page.html).toBe(
      [
        '<div class="agent-note" data-lines="1-3">',
        "<p>I haven't read the code of the <strong>export job</strong>.</p>",
        '</div>',
        '',
      ].join('\n'),
    )
  })

  it('renders each paragraph and list of the note when the note has several of them', () => {
    const page = renderedInvoicePage([
      ':::agent-note',
      "I haven't run the export job.",
      '',
      '- The retry limit comes from the config file.',
      ':::',
    ])

    expect(page.html.split('\n')).toStrictEqual([
      '<div class="agent-note" data-lines="1-5">',
      "<p>I haven't run the export job.</p>",
      '<ul>',
      '<li>The retry limit comes from the config file.</li>',
      '</ul>',
      '</div>',
      '',
    ])
  })

  it('renders a line that starts with 3 colons as text when the line is inside the note', () => {
    const page = renderedInvoicePage([':::agent-note', ':::decision d-1', 'proposal: Retry', ':::'])

    expect(page.html).toContain('<p>:::decision d-1\nproposal: Retry</p>')
    expect(page.decisions).toStrictEqual([])
  })

  it('reports the options and still renders the note when the opening line has options', () => {
    const page = renderedInvoicePage([':::agent-note warning', 'I skipped the tests.', ':::'])

    expect(page.problems).toStrictEqual([
      {
        line: 1,
        text: "the :::agent-note block doesn't take any options. Write :::agent-note on its own",
      },
    ])
    expect(page.html).toContain('<p>I skipped the tests.</p>')
  })

  it("renders an empty note without any problems when the note doesn't have any text", () => {
    const page = renderedInvoicePage([':::agent-note', ':::'])

    expect(page.problems).toStrictEqual([])
    expect(page.html).toBe('<div class="agent-note" data-lines="1-2">\n</div>\n')
  })

  it('returns the text of the note without its Markdown when the page text is built', () => {
    const blocks = pageBlocksOf(
      [':::agent-note', 'I only read the `git log`.', '', '```', 'retries: 5', '```', ':::'].join(
        '\n',
      ),
    )

    expect(blocks).toStrictEqual([
      { firstLine: 1, lastLine: 7, text: 'I only read the git log. retries: 5' },
    ])
  })
})
