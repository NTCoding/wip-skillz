import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { type ViewedPage } from './api-responses'
import { exportPad, exportPadAddresses, indexPage } from './browser-page-fixtures'
import { keyedBlocks, pageElements, parsedPageBody, type PageElementContext } from './page-elements'

function contextFor(page: ViewedPage, overrides: Partial<PageElementContext> = {}) {
  const context: PageElementContext = {
    addresses: exportPadAddresses,
    page,
    onNavigate: () => undefined,
    loadPreview: () => Promise.resolve(undefined),
    onAnswerDecision: () => Promise.resolve(),
    onCommentOnBlock: () => undefined,
    answersOnThisPage: new Map(),
    ...overrides,
  }
  return context
}

function renderPage(page: ViewedPage, overrides: Partial<PageElementContext> = {}) {
  const context = contextFor(page, overrides)
  return render(<article>{pageElements(context, parsedPageBody(page.html), new Map())}</article>)
}

function withHtml(html: string): ViewedPage {
  return { ...indexPage, html, links: [], decisions: [] }
}

describe('pageElements', () => {
  it('keeps the headings with their ids and the lines of each block when the page is converted', () => {
    const { container } = renderPage(indexPage)
    expect(screen.getByRole('heading', { level: 2, name: 'Retry limit' }).id).toBe('retry-limit')
    expect(container.querySelector('p[data-lines="3-4"]')?.textContent).toContain('paid invoices')
    expect(container.querySelector('[data-lines="10-12"] figure')?.tagName).toBe('FIGURE')
  })

  it('turns a pre into a code block with its language when the page has code', () => {
    const { container } = renderPage(indexPage)
    const block = container.querySelector('[data-lines="10-12"] figure')
    expect(block?.querySelector('figcaption')?.textContent).toContain('ts')
    expect(block?.querySelector('.syntax-keyword')?.textContent).toBe('export')
  })

  it('turns a table into a table block and keeps the alignment of a column when the page has a table', () => {
    renderPage(indexPage)
    const table = screen.getByRole('table')
    expect(table.querySelectorAll('th[data-align="right"], td[data-align="right"]')).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Open the table at full size' }).tagName).toBe(
      'BUTTON',
    )
  })

  it('renders an html block in the frame from the server and offers the full size when the page has an html block', () => {
    const { container } = renderPage(indexPage)
    const frame = container.querySelector('[data-lines="19-20"] iframe')
    expect(frame?.getAttribute('src')).toBe('/browser-page/html-block-frame.html')
    expect(container.querySelector('ol.export-steps')).toBeNull()
    expect(screen.getByRole('button', { name: 'Open the HTML block at full size' }).tagName).toBe(
      'BUTTON',
    )
  })

  it('turns a paragraph with only an image into an image block when the page has an image', () => {
    renderPage(indexPage)
    expect(screen.getByRole('img', { name: 'The 3 steps' }).getAttribute('src')).toBe('steps.svg')
    expect(screen.getByRole('button', { name: 'Open the image at full size' }).tagName).toBe(
      'BUTTON',
    )
  })

  it('turns a decision block into a decision card with its fields and question when the page has a decision', () => {
    renderPage(indexPage)
    const card = screen.getByRole('region', { name: 'Decision d-1' })
    expect(card.textContent).toContain('Will the export job retry 8 times?')
    expect(card.querySelector('dd strong')?.textContent).toBe('8')
    expect([...card.querySelectorAll('button')].map((button) => button.textContent)).toStrictEqual([
      'Proposal',
      'Alternative',
    ])
  })

  it('passes the id of the decision and Nick’s choice on when Nick answers a decision', async () => {
    const onAnswerDecision = vi.fn<NonNullable<PageElementContext['onAnswerDecision']>>(() =>
      Promise.resolve(),
    )
    renderPage(indexPage, { onAnswerDecision })
    await userEvent.click(screen.getByRole('button', { name: 'Alternative' }))
    expect(onAnswerDecision).toHaveBeenCalledWith('d-1', { choice: 'alternative' })
  })

  it('shows the choice that Nick has just made before the page is read again', () => {
    renderPage(indexPage, { answersOnThisPage: new Map([['d-1', { choice: 'proposal' }]]) })
    const card = screen.getByRole('region', { name: 'Decision d-1' })
    expect(card.textContent).toContain("Nick's answer: proposal")
    expect(card.querySelector('button')).toBeNull()
  })

  it('shows the warnings of a decision block and the choice of Nick when the decision is answered', () => {
    const html = [
      '<div class="decision" data-decision="d-1">',
      '<p class="named-block-warning">The decision doesn’t have an alternative: line.</p>',
      '<div class="decision-proposal"><p class="decision-label">Proposal</p><p>Raise it.</p></div>',
      '</div>',
    ].join('')
    const page = {
      ...withHtml(html),
      decisions: [{ id: 'd-1', question: undefined, answer: { choice: 'proposal' } }],
    }
    renderPage(page)
    expect(screen.getByRole('note').textContent).toBe(
      'The decision doesn’t have an alternative: line.',
    )
    expect(screen.getByRole('region', { name: 'Decision d-1' }).textContent).toContain(
      "Nick's answer: proposal",
    )
  })

  it('shows the text that Nick wrote when Nick wrote his own answer', () => {
    const page = {
      ...withHtml('<div class="decision" data-decision="d-2" data-lines="3-7"></div>'),
      decisions: [
        { id: 'd-2', question: 'Who pays the fee?', answer: { written: 'The shop pays.' } },
      ],
    }
    renderPage(page)
    expect(screen.getByRole('region', { name: 'Decision d-2' }).textContent).toContain(
      "Nick's answer: The shop pays.",
    )
  })

  it('shows a decision without a question when the page doesn’t know the id of the decision', () => {
    renderPage(withHtml('<div class="decision" data-decision="d-9"></div>'))
    expect(screen.getByRole('region', { name: 'Decision d-9' }).textContent).toContain(
      'Waiting for Nick',
    )
  })

  it('navigates to the target page when Nick clicks a link to another page', async () => {
    const onNavigate = vi.fn<(href: string) => void>()
    renderPage(indexPage, { onNavigate })
    await userEvent.click(screen.getByRole('link', { name: 'invoice template' }))
    expect(onNavigate).toHaveBeenCalledWith(`/${exportPad}/invoice-template.md#tax-number`)
  })

  it('loads the preview of the section when Nick focuses a link to a section of the same page', async () => {
    const loadPreview = vi.fn<PageElementContext['loadPreview']>(() => Promise.resolve(undefined))
    renderPage(indexPage, { loadPreview })
    await act(async () => {
      fireEvent.focus(screen.getByRole('link', { name: 'this section' }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    expect(loadPreview).toHaveBeenCalledWith('index.md', 'retry-limit')
  })

  it('opens a link to another site in a new tab when the link isn’t a page of the scratch pad', () => {
    renderPage(indexPage)
    const link = screen.getByRole('link', { name: 'the retry guide' })
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toBe('noreferrer')
  })

  it('keeps each block in its place in the DOM when the agent adds a block above it', () => {
    const before = withHtml(
      '<h2 data-lines="1-1">How the job runs</h2>\n<p data-lines="3-3">It writes one file per shop.</p>',
    )
    const after = withHtml(
      '<p data-lines="1-1">A new intro.</p>\n<h2 data-lines="3-3">How the job runs</h2>\n<p data-lines="5-5">It writes one file per shop.</p>',
    )
    const { container, rerender } = renderPage(before)
    const heading = screen.getByRole('heading', { name: 'How the job runs' })
    const changes = new MutationObserver(() => undefined)
    changes.observe(container, { childList: true, subtree: true })
    rerender(
      <article>{pageElements(contextFor(after), parsedPageBody(after.html), new Map())}</article>,
    )
    expect(screen.getByRole('heading', { name: 'How the job runs' })).toBe(heading)
    expect(heading.getAttribute('data-lines')).toBe('3-3')
    const moved = changes.takeRecords().flatMap((record) => [...record.removedNodes])
    expect(moved).toStrictEqual([])
  })

  it('gives 2 blocks with the same text their own keys when a page repeats a block', () => {
    const body = parsedPageBody('<p data-lines="1-1">Retry.</p><p data-lines="3-3">Retry.</p>')
    const keys = keyedBlocks([...body.childNodes]).map((block) => block.key)
    expect(keys).toStrictEqual(['1:<p>Retry.</p>', '2:<p>Retry.</p>'])
  })

  it('opens a page with a space or an accent in its name when Nick clicks a link to it', async () => {
    const onNavigate = vi.fn<(href: string) => void>()
    const page = {
      ...withHtml('<p><a href="my%20queue.md">queue</a> <a href="caf%C3%A9.md#menu">menu</a></p>'),
      links: [
        {
          kind: 'page' as const,
          href: 'my%20queue.md',
          page: 'pages/my queue.md',
          headingId: undefined,
        },
        {
          kind: 'page' as const,
          href: 'caf%C3%A9.md#menu',
          page: 'pages/café.md',
          headingId: 'menu',
        },
      ],
    }
    renderPage(page, { onNavigate })
    await userEvent.click(screen.getByRole('link', { name: 'queue' }))
    await userEvent.click(screen.getByRole('link', { name: 'menu' }))
    expect(onNavigate.mock.calls).toStrictEqual([
      [`/${exportPad}/my%20queue.md`],
      [`/${exportPad}/caf%C3%A9.md#menu`],
    ])
  })

  it('opens the target page when Nick clicks a link to another page inside an agent note', async () => {
    const onNavigate = vi.fn<(href: string) => void>()
    const page = {
      ...withHtml(
        '<div class="agent-note" data-lines="1-3">\n<p>I haven’t read <a href="export-job.md#retry-limit">the export job</a>.</p>\n</div>',
      ),
      links: [
        {
          kind: 'page' as const,
          href: 'export-job.md#retry-limit',
          page: 'pages/export-job.md',
          headingId: 'retry-limit',
        },
      ],
    }
    renderPage(page, { onNavigate })
    const note = screen.getByRole('figure')
    expect(note.textContent).toContain('Agent note')
    await userEvent.click(within(note).getByRole('link', { name: 'the export job' }))
    expect(onNavigate).toHaveBeenCalledWith(`/${exportPad}/export-job.md#retry-limit`)
  })

  it('shows the text of a link without the link when the link runs a script or isn’t a web address', () => {
    const { container } = renderPage(
      withHtml(
        '<p><a href="javascript:alert(1)">run</a> <a href=" Java&#9;Script:x">again</a> <a href="http://[">now</a></p>',
      ),
    )
    expect(container.querySelector('a')).toBeNull()
    expect(container.querySelector('p')?.textContent).toBe('run again now')
  })

  it('drops a script and a comment when the page contains them', () => {
    const { container } = renderPage(
      withHtml('<p>Retries</p><script>alert(1)</script><!-- note -->'),
    )
    expect(container.querySelector('article')?.innerHTML).toBe('<p>Retries</p>')
  })

  it('shows a warning of an unknown block as a notice when the page has an unknown block', () => {
    const html =
      '<div class="unknown-block" data-lines="1-3"><p class="named-block-warning">There aren’t any blocks called :::chart.</p><pre>retries: 5</pre></div>'
    renderPage(withHtml(html))
    expect(screen.getByRole('note').textContent).toBe('There aren’t any blocks called :::chart.')
    expect(screen.getByRole('figure').textContent).toContain('retries: 5')
  })

  it('shows code without a language when the pre doesn’t have a code element or a language', () => {
    renderPage(withHtml('<pre>retries: 5</pre><pre><code>wait: 30</code></pre>'))
    const languages = screen
      .getAllByRole('figure')
      .map((figure) => figure.querySelector('figcaption')?.textContent)
    expect(languages).toStrictEqual(['codeCopy', 'codeCopy'])
  })

  it('keeps a paragraph with an image and text as a paragraph when the page has one', () => {
    const { container } = renderPage(
      withHtml('<p><img src="a.svg" alt="A">and text</p><p><br></p>'),
    )
    expect(container.querySelectorAll('article > p')).toHaveLength(2)
    expect(screen.queryByRole('button')).toBeNull()
  })
})
