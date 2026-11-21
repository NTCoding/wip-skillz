import { act, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  exportPad,
  exportPadAddresses,
  fakeConnection,
  fakeNarrowWindow,
  pageSummaries,
  type FakeConnection,
} from './browser-page-fixtures'
import { ScratchPadApp } from './scratch-pad-app'

function renderApp(path: string, fake: FakeConnection = fakeConnection()) {
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
  return fake
}

async function shownPage(name: string): Promise<HTMLElement> {
  return screen.findByRole('heading', { level: 1, name })
}

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
})

function rowTexts(list: HTMLElement): (string | null)[] {
  return within(list)
    .getAllByRole('link')
    .map((link) => link.textContent)
}

function linkTitles(element: HTMLElement): (string | null)[] {
  return within(element)
    .getAllByRole('link')
    .map((link) => link.textContent)
}

describe('ScratchPadApp with numbered pages', () => {
  it('lists the top level pages under the text of the index page with what waits for Nick', async () => {
    renderApp(`/${exportPad}/`)
    await shownPage('Invoice export')
    const list = await screen.findByRole('list', { name: 'Pages' })
    expect(rowTexts(list)).toStrictEqual([
      'Invoice templateEach invoice shows the tax number of the shop.Nothing for you',
      'retry-limit.md1 decision and 2 replies for you',
      'Shop storageEach shop has its own storage.2 replies for you',
    ])
    expect(screen.getByRole('article').lastElementChild).toBe(list)
  })

  it('doesn’t show the list of pages when the index page is the only page', async () => {
    const fake = fakeConnection()
    vi.spyOn(fake.connection, 'pages').mockResolvedValue(pageSummaries.slice(0, 1))
    renderApp(`/${exportPad}/`, fake)
    await shownPage('Invoice export')
    await screen.findByRole('link', { name: 'Invoice export', current: 'page' })
    expect(screen.queryByRole('list', { name: 'Pages' })).toBeNull()
  })

  it('doesn’t show the list of pages on a page other than the index page', async () => {
    renderApp(`/${exportPad}/invoice-template.md`)
    await shownPage('Invoice template')
    expect(screen.queryByRole('list', { name: 'Pages' })).toBeNull()
  })

  it.each([
    ['Nick answers a decision', { kind: 'decision', id: 'd-2' }],
    ['a thread changes', { kind: 'thread', id: 'c-4' }],
  ] as const)(
    'updates what waits for Nick in the list of pages when %s',
    async (_change, change) => {
      const fake = fakeConnection()
      vi.spyOn(fake.connection, 'pages')
        .mockResolvedValueOnce(pageSummaries)
        .mockResolvedValue(
          pageSummaries.map((summary) =>
            summary.page === 'pages/retry-limit.md'
              ? { ...summary, waitingForNickWithSubPages: { decisions: 0, replies: 0 } }
              : summary,
          ),
        )
      renderApp(`/${exportPad}/`, fake)
      const list = await screen.findByRole('list', { name: 'Pages' })
      const row = within(list).getByRole('link', { name: /^retry-limit\.md/ })
      expect(row.textContent).toBe('retry-limit.md1 decision and 2 replies for you')
      act(() => fake.sendChange(change))
      await waitFor(() =>
        expect(within(list).getByRole('link', { name: /^retry-limit\.md/ }).textContent).toBe(
          'retry-limit.mdNothing for you',
        ),
      )
    },
  )

  it('lists only the top level pages in the sidebar when the index page is open', async () => {
    renderApp(`/${exportPad}/`)
    await shownPage('Invoice export')
    const sidebar = screen.getByRole('navigation', { name: 'Pages of the scratch pad' })
    expect(sidebar.querySelector('a[href$="/wait-between-retries.md"]')).toBeNull()
    expect(within(sidebar).getByRole('link', { name: 'Shop storage' }).getAttribute('href')).toBe(
      `/${exportPad}/shop-storage.md`,
    )
  })

  it('opens the branch of the open page in the sidebar with the sections under the open page', async () => {
    renderApp(`/${exportPad}/first-retry.md`)
    await shownPage('First retry')
    const sidebar = screen.getByRole('navigation', { name: 'Pages of the scratch pad' })
    const branch = within(sidebar).getByRole('link', { name: 'retry-limit.md' }).closest('li')
    expect(linkTitles(branch ?? sidebar)).toStrictEqual([
      'retry-limit.md',
      'Wait between retries',
      'First retry',
      'Why 30 seconds?',
    ])
    expect(
      within(sidebar).getByRole('link', { name: 'First retry' }).getAttribute('aria-current'),
    ).toBe('page')
    expect(
      within(sidebar).getByRole('link', { name: 'Invoice template' }).closest('li')?.textContent,
    ).toBe('Invoice template')
  })

  it('shows every parent of the open page in the breadcrumb', async () => {
    renderApp(`/${exportPad}/first-retry.md`)
    await shownPage('First retry')
    const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(breadcrumb.textContent).toBe(
      'Invoice export/retry-limit.md/Wait between retries/First retry',
    )
    expect(
      within(breadcrumb)
        .getAllByRole('link')
        .map((link) => link.getAttribute('href')),
    ).toStrictEqual([
      `/${exportPad}/`,
      `/${exportPad}/retry-limit.md`,
      `/${exportPad}/wait-between-retries.md`,
    ])
  })
})
