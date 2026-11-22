import { render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  exportPad,
  exportPadAddresses,
  fakeConnection,
  fakeNarrowWindow,
  indexPage,
  type FakeConnection,
} from './browser-page-fixtures'
import { ScratchPadApp } from './scratch-pad-app'

function renderApp(path: string, fake: FakeConnection): void {
  window.history.replaceState(null, '', path)
  render(
    <ScratchPadApp
      pad={exportPad}
      addresses={exportPadAddresses}
      connection={fake.connection}
      writing={fake.connection}
      settings={window.localStorage}
      narrowWindow={fakeNarrowWindow()}
    />,
  )
}

async function shownPage(name: string): Promise<HTMLElement> {
  return screen.findByRole('heading', { level: 1, name })
}

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
})

describe('the index page from the server', () => {
  // The server adds the headings "Introduction" and "Table of contents" to the index page. They
  // don't have any data-lines, because they aren't in index.md.
  function fakeWithIntroduction(html: readonly string[]): FakeConnection {
    const fake = fakeConnection()
    fake.pages.set('index.md', {
      ...indexPage,
      html: html.join('\n'),
      headings: [
        { level: 1, text: 'Invoice export', id: 'invoice-export', line: 1 },
        { level: 2, text: 'Introduction', id: 'introduction', line: 2 },
        { level: 3, text: 'Retry limit', id: 'retry-limit', line: 6 },
        { level: 2, text: 'Table of contents', id: 'table-of-contents', line: 12 },
      ],
      decisions: [{ id: 'd-1', question: 'Invoice export', answer: { choice: 'proposal' } }],
    })
    fake.threads.set('index.md', [])
    return fake
  }

  const decisionUnderTheTitle = [
    '<div class="decision" data-decision="d-1" data-lines="3-7">',
    '<div class="decision-proposal"><p class="decision-label">Proposal</p><p>Raise the retry limit to 8.</p></div>',
    '<div class="decision-alternative"><p class="decision-label">Alternative</p><p>Keep the retry limit at 5.</p></div>',
    '<div class="decision-pick"><p class="decision-label">Pick</p><p>proposal</p></div>',
    '</div>',
  ]

  it('lists the introduction and the table of contents as sections and shows the list of pages under the table of contents', async () => {
    renderApp(
      `/${exportPad}/`,
      fakeWithIntroduction([
        '<h1 data-lines="1-1" id="invoice-export">Invoice export</h1>',
        '<h2 id="introduction">Introduction</h2>',
        '<p data-lines="3-3">The export job writes one file per shop.</p>',
        '<h3 data-lines="6-6" id="retry-limit">Retry limit</h3>',
        '<h2 id="table-of-contents">Table of contents</h2>',
      ]),
    )
    await shownPage('Invoice export')
    const sections = screen.getByRole('list', { name: 'Sections of Invoice export' })
    const tableOfContents = screen.getByRole('heading', { level: 2, name: 'Table of contents' })
    const pages = await screen.findByRole('list', { name: 'Pages' })
    expect([
      within(sections)
        .getAllByRole('link')
        .map((link) => link.getAttribute('href')),
      tableOfContents.compareDocumentPosition(pages) & Node.DOCUMENT_POSITION_FOLLOWING,
    ]).toStrictEqual([
      [
        `/${exportPad}/#introduction`,
        `/${exportPad}/#retry-limit`,
        `/${exportPad}/#table-of-contents`,
      ],
      Node.DOCUMENT_POSITION_FOLLOWING,
    ])
  })

  it('shows an answered decision beside the title rather than beside the Introduction heading when the decision is straight under the title', async () => {
    renderApp(
      `/${exportPad}/`,
      fakeWithIntroduction([
        '<h1 data-lines="1-1" id="invoice-export">Invoice export</h1>',
        '<h2 id="introduction">Introduction</h2>',
        ...decisionUnderTheTitle,
        '<h2 id="table-of-contents">Table of contents</h2>',
      ]),
    )
    await shownPage('Invoice export')
    expect(document.querySelector('[data-marker="d-1"]')?.getAttribute('data-anchor-lines')).toBe(
      '1-1',
    )
  })
})
