import { describe, expect, it } from 'vitest'
import { pageHeadings, renderLinks } from './rendered-page'
import { invoiceHtml, renderedInvoicePage } from './rendered-page-fixtures'

describe('renderPage', () => {
  it('stamps each top-level block with its first and last line when the page has several kinds of block', () => {
    expect(
      invoiceHtml([
        'The invoice shows the tax number',
        'of the shop.',
        '',
        '- one line per product',
        '- one line for the shipping',
        '',
        '> Only for companies.',
        '',
        '---',
      ]),
    ).toBe(
      [
        '<p data-lines="1-2">The invoice shows the tax number',
        'of the shop.</p>',
        '<ul data-lines="4-5">',
        '<li>one line per product</li>',
        '<li>one line for the shipping</li>',
        '</ul>',
        '<blockquote data-lines="7-7">',
        '<p>Only for companies.</p>',
        '</blockquote>',
        '<hr data-lines="9-9">',
        '',
      ].join('\n'),
    )
  })

  it('stamps a table with its lines when the page has a table', () => {
    expect(invoiceHtml(['| Field | Shown |', '|---|---|', '| tax number | yes |'])).toMatch(
      /^<table data-lines="1-3">\n<thead>\n<tr>\n<th>Field<\/th>/,
    )
  })

  it('leaves out the blank lines after a list when the list ends in blank lines', () => {
    expect(invoiceHtml(['- a', '  ', '- b', '', '', 'text'])).toContain('<ul data-lines="1-3">')
  })

  it('escapes raw HTML when the Markdown contains HTML outside an html block', () => {
    expect(invoiceHtml(['<script>alert(1)</script>'])).toBe(
      '<p data-lines="1-1">&lt;script&gt;alert(1)&lt;/script&gt;</p>\n',
    )
  })

  it('renders the code with the class language-ts when a fence starts with ```ts', () => {
    expect(invoiceHtml(['```ts', 'const limit = 1 < 2', '```'])).toBe(
      '<pre data-lines="1-3"><code class="language-ts">const limit = 1 &lt; 2\n</code></pre>\n',
    )
  })

  it("renders the code without a class when a fence doesn't start with a language", () => {
    expect(invoiceHtml(['```', 'retry 5', '```'])).toBe(
      '<pre data-lines="1-3"><code>retry 5\n</code></pre>\n',
    )
  })

  it('renders a code block without lines when the fence is inside a list', () => {
    expect(invoiceHtml(['- step', '', '  ```bash', '  retry', '  ```'])).toContain(
      '<pre><code class="language-bash">retry\n</code></pre>',
    )
  })

  it('stamps an indented code block with its lines when the page has one', () => {
    expect(invoiceHtml(['    retry 5'])).toBe(
      '<pre data-lines="1-1"><code>retry 5\n</code></pre>\n',
    )
  })

  it('returns the problems in the order of their lines when several blocks have problems', () => {
    const page = renderedInvoicePage([
      ':::chart',
      ':::',
      '',
      ':::html file=custom/missing.html',
      ':::',
    ])

    expect(page.problems.map((problem) => problem.line)).toStrictEqual([1, 4])
  })

  it('returns the parts of the result without any problems when every block of the page is valid', () => {
    const page = renderedInvoicePage([
      '## Tax number',
      '',
      'See [the export job](export-job.md).',
      '',
      ':::decision d-1',
      'proposal: Show the tax number.',
      'alternative: Hide the tax number.',
      'pick: proposal',
      ':::',
    ])

    expect(page.headings.map((heading) => heading.id)).toStrictEqual(['tax-number'])
    expect(page.links.map((link) => link.href)).toStrictEqual(['export-job.md'])
    expect(page.decisions.map((decision) => decision.id)).toStrictEqual(['d-1'])
    expect(page.problems).toStrictEqual([])
  })
})

describe('pageHeadings', () => {
  it('returns the headings in the order of their lines when the page has 2 headings', () => {
    expect(pageHeadings('# Invoice template\n\n## Tax number\n')).toStrictEqual([
      { level: 1, text: 'Invoice template', id: 'invoice-template', line: 1 },
      { level: 2, text: 'Tax number', id: 'tax-number', line: 3 },
    ])
  })
})

describe('renderLinks', () => {
  it('renders a link to a page, a link to another site and a bare URL as links', () => {
    expect(
      renderLinks(
        'Open https://claude.ai/a. Read [the docs](https://x.dev/a_b) and reply on [the section](next-steps.md#edit-access).',
      ),
    ).toStrictEqual({
      html: '<p>Open <a href="https://claude.ai/a">https://claude.ai/a</a>. Read <a href="https://x.dev/a_b">the docs</a> and reply on <a href="next-steps.md#edit-access">the section</a>.</p>\n',
      links: [
        { kind: 'other', line: 1, href: 'https://claude.ai/a' },
        { kind: 'other', line: 1, href: 'https://x.dev/a_b' },
        {
          kind: 'page',
          line: 1,
          href: 'next-steps.md#edit-access',
          page: 'pages/next-steps.md',
          headingId: 'edit-access',
        },
      ],
    })
  })

  it('renders a URL in backticks as inline code rather than as a link', () => {
    expect(renderLinks('Open `https://a.dev` and https://b.dev')).toStrictEqual({
      html: '<p>Open <code>https://a.dev</code> and <a href="https://b.dev">https://b.dev</a></p>\n',
      links: [{ kind: 'other', line: 1, href: 'https://b.dev' }],
    })
  })

  it('leaves every other Markdown character as text and starts a paragraph after a blank line', () => {
    expect(
      renderLinks('# Not a *heading*\n- not a list <b>x</b> \\[x] next-steps.md\n\nSecond').html,
    ).toBe(
      '<p># Not a *heading*\n- not a list &lt;b&gt;x&lt;/b&gt; \\[x] next-steps.md</p>\n<p>Second</p>\n',
    )
  })
})
