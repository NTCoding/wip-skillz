import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type SearchResult } from './api-responses'
import {
  exportPad,
  exportPadAddresses,
  fakeConnection,
  fakeNarrowWindow,
  retrySearchResults,
  type FakeConnection,
} from './browser-page-fixtures'
import { BrowserPageError } from './browser-page-error'
import { searchDelayMilliseconds } from './pad-search'
import { ScratchPadApp } from './scratch-pad-app'

const searchLabel = 'Search the pages'

function renderApp(path: string, fake: FakeConnection = fakeConnection(), withSearch = true) {
  window.history.replaceState(null, '', path)
  render(
    <ScratchPadApp
      pad={exportPad}
      addresses={exportPadAddresses}
      connection={fake.connection}
      writing={fake.connection}
      search={withSearch ? fake.connection.search : undefined}
      settings={window.localStorage}
      narrowWindow={fakeNarrowWindow()}
    />,
  )
  return fake
}

async function shownIndexPage(fake?: FakeConnection): Promise<FakeConnection> {
  const shown = renderApp(`/${exportPad}/`, fake)
  await screen.findByRole('heading', { level: 1, name: 'Invoice export' })
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  return shown
}

function searchField(): HTMLElement {
  return screen.getByRole('combobox', { name: searchLabel })
}

function pressShortcut(
  key: { readonly metaKey?: boolean; readonly ctrlKey?: boolean } = { metaKey: true },
): void {
  fireEvent.keyDown(document.body, { key: 'k', ...key })
}

async function waitForTheSearch(milliseconds = searchDelayMilliseconds): Promise<void> {
  await act(async () => {
    vi.advanceTimersByTime(milliseconds)
    await Promise.resolve()
  })
}

async function searchFor(query: string): Promise<void> {
  fireEvent.change(searchField(), { target: { value: query } })
  await waitForTheSearch()
}

function shownResults(): (string | null)[] {
  return screen.queryAllByRole('option').map((option) => option.textContent)
}

function searchMarks(): (string | null)[] {
  return [...document.querySelectorAll('mark.highlight[data-kind="search"]')].map(
    (mark) => mark.textContent,
  )
}

async function openResult(key: string): Promise<void> {
  fireEvent.keyDown(searchField(), { key })
  vi.useRealTimers()
  await screen.findByRole('heading', { level: 1, name: /./ })
}

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('the search of the pages', () => {
  it('shows the search button to the left of the Inbox and opens the palette when Nick clicks it', async () => {
    renderApp(`/${exportPad}/`)
    const button = await screen.findByRole('button', { name: searchLabel })
    expect(button.nextElementSibling?.querySelector('button')?.getAttribute('aria-label')).toMatch(
      /^Inbox/,
    )
    await userEvent.click(button)
    expect(screen.getByRole('dialog', { name: searchLabel }).hasAttribute('open')).toBe(true)
    expect(screen.getByRole('button', { name: searchLabel, hidden: true }).ariaPressed).toBe('true')
  })

  it('opens the palette when Nick presses ⌘K', async () => {
    await shownIndexPage()
    pressShortcut()
    expect(document.activeElement).toBe(searchField())
  })

  it.each([{}, { ctrlKey: true }])(
    'doesn’t open the palette when Nick presses K with %o, because Ctrl+K deletes to the end of the line on macOS',
    async (modifier) => {
      await shownIndexPage()
      fireEvent.keyDown(document.body, { key: 'k', ...modifier })
      expect(screen.queryByRole('dialog')).toBeNull()
    },
  )

  it('only searches once Nick has stopped typing for 2 seconds', async () => {
    const fake = await shownIndexPage()
    pressShortcut()
    fireEvent.change(searchField(), { target: { value: 'ret' } })
    await waitForTheSearch(searchDelayMilliseconds - 1)
    fireEvent.change(searchField(), { target: { value: 'retry' } })
    await waitForTheSearch(searchDelayMilliseconds - 1)
    expect(fake.connection.search).not.toHaveBeenCalled()
    await waitForTheSearch(1)
    expect(vi.mocked(fake.connection.search).mock.calls).toStrictEqual([['retry']])
  })

  it('lists each result with its page, its heading and its snippet with the matches highlighted', async () => {
    await shownIndexPage()
    pressShortcut()
    await searchFor('retry')
    expect(shownResults()).toStrictEqual([
      `Invoice export › Retry limit${String(retrySearchResults[0]?.snippet)}↵`,
      'First retry › Why 30 seconds?The first retry waits 30 seconds.↵',
    ])
    expect(
      [...(screen.getAllByRole('option')[0]?.querySelectorAll('mark') ?? [])].map(
        (mark) => mark.textContent,
      ),
    ).toStrictEqual(['retry', 'retry'])
  })

  it('shows the file of the page when the page doesn’t have a title and leaves out a heading that the result doesn’t have', async () => {
    const fake = fakeConnection()
    vi.mocked(fake.connection.search).mockResolvedValue([
      {
        page: 'pages/storage-timeout.md',
        heading: undefined,
        headingId: undefined,
        snippet: 'The storage times out after 20 seconds.',
        matches: [{ start: 12, end: 17 }],
      },
    ])
    await shownIndexPage(fake)
    pressShortcut()
    await searchFor('times')
    expect(shownResults()).toStrictEqual([
      'storage-timeout.mdThe storage times out after 20 seconds.↵',
    ])
  })

  it('scrolls to the top of the page when the match is before the first heading', async () => {
    const fake = fakeConnection()
    vi.mocked(fake.connection.search).mockResolvedValue([
      {
        page: 'pages/invoice-template.md',
        heading: 'Invoice template',
        headingId: undefined,
        snippet: 'Each invoice uses one template.',
        matches: [{ start: 5, end: 12 }],
      },
    ])
    await shownIndexPage(fake)
    pressShortcut()
    await searchFor('invoice')
    vi.mocked(window.scrollTo).mockClear()
    await openResult('Enter')
    await screen.findByRole('heading', { level: 1, name: 'Invoice template' })
    expect(`${window.location.pathname}${window.location.hash}`).toBe(
      `/${exportPad}/invoice-template.md`,
    )
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0)
  })

  it('removes the old results as soon as Nick changes the query so that Enter doesn’t open any of them', async () => {
    await shownIndexPage()
    pressShortcut()
    await searchFor('retry')
    fireEvent.change(searchField(), { target: { value: 'retry limit' } })
    fireEvent.keyDown(searchField(), { key: 'Enter' })
    expect(shownResults()).toStrictEqual([])
    expect(screen.queryByRole('status')).toBeNull()
    expect(`${window.location.pathname}${window.location.hash}`).toBe(`/${exportPad}/`)
  })

  it('tells Nick that there aren’t any results only after the search has returned without any', async () => {
    await shownIndexPage()
    pressShortcut()
    fireEvent.change(searchField(), { target: { value: '  refund ' } })
    await waitForTheSearch(searchDelayMilliseconds - 1)
    expect(screen.queryByRole('status')).toBeNull()
    await waitForTheSearch(1)
    expect(screen.getByRole('status').textContent).toBe('No results for “refund”')
  })

  it('closes the palette and gives the focus back to the search button when Nick clicks the dimmed page', async () => {
    renderApp(`/${exportPad}/`)
    await userEvent.click(await screen.findByRole('button', { name: searchLabel }))
    const dialog = screen.getByRole('dialog', { name: searchLabel })
    fireEvent.mouseDown(dialog)
    fireEvent.click(dialog)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: searchLabel }))
  })

  it('removes the results without searching when Nick empties the field', async () => {
    const fake = await shownIndexPage()
    pressShortcut()
    await searchFor('retry')
    await searchFor('')
    expect(shownResults()).toStrictEqual([])
    expect(vi.mocked(fake.connection.search).mock.calls).toStrictEqual([['retry']])
  })

  it('doesn’t search when the field only contains whitespace', async () => {
    const fake = await shownIndexPage()
    pressShortcut()
    await searchFor('retry')
    await searchFor('   ')
    expect(shownResults()).toStrictEqual([])
    expect(vi.mocked(fake.connection.search).mock.calls).toStrictEqual([['retry']])
  })

  it('shows the problem and removes the old results when the search fails', async () => {
    const fake = fakeConnection()
    vi.mocked(fake.connection.search)
      .mockResolvedValueOnce(retrySearchResults)
      .mockRejectedValueOnce(new BrowserPageError('The server didn’t respond.'))
    await shownIndexPage(fake)
    pressShortcut()
    await searchFor('retry')
    await searchFor('retry limit')
    expect(shownResults()).toStrictEqual([])
    expect(screen.getByRole('alert').textContent).toBe('The server didn’t respond.')
  })

  it('removes the problem when the next search finds results', async () => {
    const fake = fakeConnection()
    vi.mocked(fake.connection.search).mockRejectedValueOnce(new BrowserPageError('Offline.'))
    await shownIndexPage(fake)
    pressShortcut()
    await searchFor('retry')
    fireEvent.change(searchField(), { target: { value: 'retr' } })
    await searchFor('retry')
    expect(screen.queryByRole('alert')).toBeNull()
    expect(shownResults()).toHaveLength(2)
  })

  it('drops the failure of a query that Nick has changed while the server was searching', async () => {
    const fake = fakeConnection()
    const pending = Promise.withResolvers<SearchResult[]>()
    vi.mocked(fake.connection.search).mockReturnValueOnce(pending.promise)
    await shownIndexPage(fake)
    pressShortcut()
    await searchFor('retry')
    fireEvent.change(searchField(), { target: { value: 'retry limit' } })
    await act(async () => {
      pending.reject(new BrowserPageError('Offline.'))
      await pending.promise.catch(() => undefined)
    })
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('drops the results of a query that Nick has changed while the server was searching', async () => {
    const fake = fakeConnection()
    const pending = Promise.withResolvers<SearchResult[]>()
    vi.mocked(fake.connection.search).mockReturnValueOnce(pending.promise)
    await shownIndexPage(fake)
    pressShortcut()
    await searchFor('retry')
    fireEvent.change(searchField(), { target: { value: 'retry limit' } })
    await act(async () => {
      pending.resolve(retrySearchResults)
      await pending.promise
    })
    expect(shownResults()).toStrictEqual([])
  })

  it('opens the page of the selected result and highlights the query under its heading when Nick presses Enter', async () => {
    await shownIndexPage()
    pressShortcut()
    await searchFor('retry')
    fireEvent.keyDown(searchField(), { key: 'ArrowDown' })
    await openResult('Enter')
    expect(await screen.findByRole('heading', { level: 1, name: 'First retry' })).toBeDefined()
    expect(`${window.location.pathname}${window.location.hash}`).toBe(
      `/${exportPad}/first-retry.md#why-30-seconds`,
    )
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('scrolls to the heading and highlights every copy of the query under that heading only', async () => {
    await shownIndexPage()
    pressShortcut()
    await searchFor('retry')
    await openResult('Enter')
    expect(searchMarks()).toStrictEqual(['Retry', 'retry'])
    expect(screen.getByRole('heading', { name: 'Retry limit' }).dataset['scrolledIntoView']).toBe(
      'true',
    )
  })

  it('removes the highlight when Nick clicks on the page', async () => {
    await shownIndexPage()
    pressShortcut()
    await searchFor('retry')
    await openResult('Enter')
    fireEvent.mouseDown(screen.getByRole('heading', { name: 'Retry limit' }))
    expect(searchMarks()).toStrictEqual([])
  })

  it('removes the highlight when Nick presses Escape', async () => {
    await shownIndexPage()
    pressShortcut()
    await searchFor('retry')
    await openResult('Enter')
    fireEvent.keyDown(document.body, { key: 'Shift' })
    expect(searchMarks()).toStrictEqual(['Retry', 'retry'])
    fireEvent.keyDown(document.body, { key: 'Escape' })
    expect(searchMarks()).toStrictEqual([])
  })

  it('only scrolls to the heading when the query isn’t in the text that the page shows', async () => {
    const fake = fakeConnection()
    vi.mocked(fake.connection.search).mockResolvedValue([
      {
        page: 'pages/index.md',
        heading: 'Retry limit',
        headingId: 'retry-limit',
        snippet: 'See [the retry guide](https://example.com/retries).',
        matches: [{ start: 30, end: 41 }],
      },
    ])
    await shownIndexPage(fake)
    pressShortcut()
    await searchFor('example.com')
    await openResult('Enter')
    expect(searchMarks()).toStrictEqual([])
    expect(`${window.location.pathname}${window.location.hash}`).toBe(`/${exportPad}/#retry-limit`)
  })

  it('shows the same query with the same result selected when Nick presses ⌘K again', async () => {
    await shownIndexPage()
    pressShortcut()
    await searchFor('retry')
    fireEvent.keyDown(searchField(), { key: 'ArrowDown' })
    await openResult('Enter')
    pressShortcut()
    const options = screen.getAllByRole('option')
    expect(searchField()).toHaveProperty('value', 'retry')
    expect(options.map((option) => option.getAttribute('aria-selected'))).toStrictEqual([
      'false',
      'true',
    ])
  })

  it('closes the palette without opening anything when Nick presses Escape', async () => {
    await shownIndexPage()
    pressShortcut()
    await searchFor('retry')
    fireEvent.keyDown(searchField(), { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(`${window.location.pathname}${window.location.hash}`).toBe(`/${exportPad}/`)
  })

  it('doesn’t show the search button when the page doesn’t have a search', async () => {
    renderApp(`/${exportPad}/`, fakeConnection(), false)
    const inbox = await screen.findByRole('button', { name: /^Inbox/ })
    expect(within(document.body).queryByRole('button', { name: searchLabel })).toBeNull()
    expect(inbox).toBeDefined()
  })
})
