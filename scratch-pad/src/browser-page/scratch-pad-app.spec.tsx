import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  exportPad,
  exportPadAddresses,
  fakeConnection,
  indexPage,
  progressTracker,
  retryQuestion,
  type FakeConnection,
} from './browser-page-fixtures'
import { BrowserPageError } from './browser-page-error'
import { ScratchPadApp } from './scratch-pad-app'

function renderApp(
  path: string,
  fake: FakeConnection = fakeConnection(),
  prefersDark = false,
  narrowWindow = false,
) {
  window.history.replaceState(null, '', path)
  const rendered = render(
    <ScratchPadApp
      pad={exportPad}
      addresses={exportPadAddresses}
      connection={fake.connection}
      writing={fake.connection}
      settings={window.localStorage}
      prefersDark={prefersDark}
      narrowWindow={narrowWindow}
    />,
  )
  return { ...rendered, fake }
}

async function shownPage(name: string): Promise<HTMLElement> {
  return screen.findByRole('heading', { level: 1, name })
}

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
})

describe('ScratchPadApp on a page', () => {
  it('shows the title of the scratch pad and the page in the breadcrumb when the address is the scratch pad', async () => {
    renderApp(`/${exportPad}/`)
    await shownPage('Invoice export')
    const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(within(breadcrumb).getByRole('link').getAttribute('href')).toBe(`/${exportPad}/`)
    expect(breadcrumb.textContent).toBe('Invoice export/Invoice export')
    expect(
      screen.getByRole('link', { name: 'Progress tracker' }).getAttribute('aria-current'),
    ).toBeNull()
    expect(document.title).toBe('Invoice export')
  })

  it('shows the outline of the page with the current section when the page has sections', async () => {
    renderApp(`/${exportPad}/`)
    await shownPage('Invoice export')
    const outline = screen.getByRole('navigation', { name: 'Outline of Invoice export' })
    expect(
      within(outline)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toStrictEqual(['Retry limit', 'Wait between retries', 'Will the export job retry 8 times?'])
    await waitFor(() =>
      expect(
        within(outline)
          .getByRole('link', { name: 'Will the export job retry 8 times?' })
          .getAttribute('aria-current'),
      ).toBe('location'),
    )
  })

  it('names the outline after the file when the page doesn’t have a title', async () => {
    const fake = fakeConnection()
    vi.spyOn(fake.connection, 'page').mockResolvedValue({ ...indexPage, title: undefined })
    renderApp(`/${exportPad}/`, fake)
    expect(await screen.findByRole('navigation', { name: 'Outline of index.md' })).toBeDefined()
  })

  it('lists the pages and the sections of the current page in the sidebar when the page is shown', async () => {
    renderApp(`/${exportPad}/`)
    await shownPage('Invoice export')
    const sidebar = screen.getByRole('navigation', { name: 'Pages of the scratch pad' })
    const sections = within(sidebar).getByRole('list', { name: 'Sections of Invoice export' })
    expect(within(sidebar).getByRole('link', { name: 'retry-limit.md' }).getAttribute('href')).toBe(
      `/${exportPad}/retry-limit.md`,
    )
    expect(
      within(sections)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toStrictEqual(['Retry limit', 'Wait between retries', 'Will the export job retry 8 times?'])
  })

  it('shows another page and its address when Nick clicks it in the sidebar', async () => {
    renderApp(`/${exportPad}/`)
    await shownPage('Invoice export')
    await userEvent.click(screen.getByRole('link', { name: 'Invoice template' }))
    await shownPage('Invoice template')
    expect(window.location.pathname).toBe(`/${exportPad}/invoice-template.md`)
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0)
  })

  it('shows the page before when Nick goes back in the browser', async () => {
    renderApp(`/${exportPad}/`)
    await shownPage('Invoice export')
    await userEvent.click(screen.getByRole('link', { name: 'Invoice template' }))
    await shownPage('Invoice template')
    act(() => {
      window.history.replaceState(null, '', `/${exportPad}/`)
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    expect(await shownPage('Invoice export')).toBeDefined()
  })

  it('scrolls to the section when the address has a hash', async () => {
    renderApp(`/${exportPad}/invoice-template.md#tax-number`)
    await shownPage('Invoice template')
    await waitFor(() =>
      expect(
        screen.getByRole('heading', { name: 'Tax number' }).getAttribute('data-scrolled-into-view'),
      ).toBe('true'),
    )
  })

  it('shows the preview of the target section when Nick focuses a link to another page', async () => {
    renderApp(`/${exportPad}/`)
    await shownPage('Invoice export')
    act(() => screen.getByRole('link', { name: 'invoice template' }).focus())
    const preview = await screen.findByRole('tooltip')
    expect(preview.textContent).toContain('Tax number')
    expect(preview.textContent).toContain('Invoice export / Invoice template')
  })

  it('says that the page doesn’t exist when the address names a page that isn’t in the scratch pad', async () => {
    renderApp(`/${exportPad}/queue.md`)
    await shownPage('queue.md')
    expect(screen.getByRole('status').textContent).toBe(
      'There isn’t any page called queue.md in this scratch pad.',
    )
  })

  it('shows the error of the server when an existing page can’t be read', async () => {
    renderApp(`/${exportPad}/retry-limit.md`)
    expect((await screen.findByRole('note')).textContent).toBe(
      "There isn't any page called retry-limit.md.",
    )
  })

  it('shows the threads that wait for Nick on a deleted page so that Nick can resolve them', async () => {
    const fake = fakeConnection()
    const onDeletedPage = { ...retryQuestion, id: 'c-4', page: 'pages/queue.md' }
    vi.spyOn(fake.connection, 'nickInbox').mockResolvedValue({
      threads: [retryQuestion, onDeletedPage],
      decisions: [],
    })
    renderApp(`/${exportPad}/queue.md`, fake)
    const card = await screen.findByRole('region', { name: 'Comment c-4' })
    expect(screen.getByRole('note').textContent).toContain('The agent has deleted this page.')
    expect(screen.getByText('retries 5 times').tagName).toBe('BLOCKQUOTE')
    await userEvent.click(within(card).getByRole('button', { name: 'Resolve c-4' }))
    expect(await within(card).findByText('Resolved')).toBeDefined()
  })

  it('shows Nick’s reply at once when Nick replies to a thread on a deleted page', async () => {
    const fake = fakeConnection()
    const onDeletedPage = { ...retryQuestion, id: 'c-4', page: 'pages/queue.md', anchor: undefined }
    vi.spyOn(fake.connection, 'nickInbox').mockResolvedValue({
      threads: [onDeletedPage],
      decisions: [],
    })
    renderApp(`/${exportPad}/queue.md`, fake)
    const card = await screen.findByRole('region', { name: 'Comment c-4' })
    expect(document.querySelector('blockquote')).toBeNull()
    await userEvent.type(
      within(card).getByRole('textbox', { name: 'Write a reply…' }),
      'Fine.{Enter}',
    )
    expect(await within(card).findByText('Fine.')).toBeDefined()
  })
})

describe('ScratchPadApp with live changes', () => {
  it('shows the new text of the page without a reload when the agent changes the page', async () => {
    const { fake } = renderApp(`/${exportPad}/`)
    await shownPage('Invoice export')
    fake.pages.set('index.md', {
      ...indexPage,
      html: '<h1>Invoice export</h1><p>The job retries 8 times.</p>',
    })
    act(() => fake.sendChange({ kind: 'page', page: 'pages/index.md' }))
    expect((await screen.findByText('The job retries 8 times.')).tagName).toBe('P')
  })

  it('reads the page again when Nick answers a decision of the page', async () => {
    const { fake } = renderApp(`/${exportPad}/`)
    await shownPage('Invoice export')
    fake.pages.set('index.md', {
      ...indexPage,
      decisions: [
        {
          id: 'd-1',
          question: 'Will the export job retry 8 times?',
          answer: { choice: 'proposal' },
        },
      ],
    })
    act(() => fake.sendChange({ kind: 'decision', id: 'd-1' }))
    expect((await screen.findByText(/Nick's answer/)).textContent).toBe("Nick's answer: proposal")
  })

  it('reads the tracker and the log again when they change', async () => {
    const { fake } = renderApp(`/${exportPad}/progress-tracker`)
    await shownPage('Progress tracker')
    const spy = vi.spyOn(fake.connection, 'decisionLog')
    act(() => {
      fake.sendChange({ kind: 'progress-tracker' })
      fake.sendChange({ kind: 'decision-log' })
      fake.sendChange({ kind: 'thread', id: 'c-1' })
    })
    await waitFor(() => expect(spy).toHaveBeenCalledWith(exportPad))
  })

  it('shows that the server has stopped and still shows the page when the stream of changes is lost', async () => {
    const { fake } = renderApp(`/${exportPad}/`)
    await shownPage('Invoice export')
    act(() => fake.sendConnection(false))
    expect(screen.getByRole('status').textContent).toBe(
      'The server has stopped. The page will update when it’s back.',
    )
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Invoice export')
  })

  it('reads the page again and hides the notice when the stream of changes is back', async () => {
    const { fake } = renderApp(`/${exportPad}/`)
    await shownPage('Invoice export')
    act(() => fake.sendConnection(false))
    fake.pages.set('index.md', {
      ...indexPage,
      html: '<h1>Invoice export</h1><p>The job retries 8 times.</p>',
    })
    act(() => fake.sendConnection(true))
    expect((await screen.findByText('The job retries 8 times.')).tagName).toBe('P')
    expect(screen.queryByText(/The server has stopped/)).toBeNull()
  })

  it('reads the threads and the Inbox again when the stream of changes is back', async () => {
    const { fake } = renderApp(`/${exportPad}/`)
    await shownPage('Invoice export')
    const threads = vi.spyOn(fake.connection, 'threads')
    const inbox = vi.spyOn(fake.connection, 'nickInbox')
    act(() => fake.sendConnection(true))
    await waitFor(() => expect(threads).toHaveBeenCalledWith('index.md'))
    expect(inbox).toHaveBeenCalledWith(exportPad)
  })

  it('closes the stream of changes when the page is closed', async () => {
    const { fake, unmount } = renderApp(`/${exportPad}/`)
    await shownPage('Invoice export')
    unmount()
    expect(fake.closeChanges).toHaveBeenCalledWith()
  })
})

describe('ScratchPadApp on the progress tracker and the decisions', () => {
  it('shows the goal and the tasks when Nick opens the progress tracker', async () => {
    renderApp(`/${exportPad}/`)
    await shownPage('Invoice export')
    await userEvent.click(screen.getByRole('link', { name: 'Progress tracker' }))
    await shownPage('Progress tracker')
    expect(screen.getByText('Goal: Ship the invoice export job.').tagName).toBe('P')
    expect(screen.getAllByRole('listitem').map((task) => task.textContent)).toContain(
      '1Design the export jobDone',
    )
  })

  it('says that there aren’t any tasks and that the goal isn’t set when the tracker is empty', async () => {
    const fake = fakeConnection()
    vi.spyOn(fake.connection, 'progressTracker').mockResolvedValue({
      ...progressTracker,
      goal: undefined,
      tasks: [],
    })
    renderApp(`/${exportPad}/progress-tracker`, fake)
    await shownPage('Progress tracker')
    expect(screen.getByText('The goal hasn’t been set yet.').tagName).toBe('P')
    expect(screen.getByRole('status').textContent).toBe('There aren’t any tasks yet.')
  })

  it('shows the log of decisions when Nick opens the decisions', async () => {
    renderApp(`/${exportPad}/decisions`)
    await shownPage('Decisions')
    expect(screen.getByText('The export job runs every night.').tagName).toBe('P')
    expect(screen.getByRole('link', { name: 'Decisions' }).getAttribute('aria-current')).toBe(
      'page',
    )
  })

  it('shows the view in the breadcrumb and leaves out the outline when Nick opens the progress tracker', async () => {
    renderApp(`/${exportPad}/progress-tracker`)
    await shownPage('Progress tracker')
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' }).textContent).toBe(
      'Invoice export/Progress tracker',
    )
    expect(
      screen.getByRole('link', { name: 'Progress tracker' }).getAttribute('aria-current'),
    ).toBe('page')
    expect(screen.queryByRole('navigation', { name: /^Outline/ })).toBeNull()
  })

  it('shows Decisions in the breadcrumb when Nick opens the decisions', async () => {
    renderApp(`/${exportPad}/decisions`)
    await shownPage('Decisions')
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' }).textContent).toBe(
      'Invoice export/Decisions',
    )
  })

  it('says that the log is empty when there aren’t any decisions', async () => {
    const fake = fakeConnection()
    vi.spyOn(fake.connection, 'decisionLog').mockResolvedValue([])
    renderApp(`/${exportPad}/decisions`, fake)
    await shownPage('Decisions')
    expect(screen.getByRole('status').textContent).toBe(
      'There aren’t any decisions in the log yet.',
    )
  })

  it('shows loading and then the error when the tracker can’t be read', async () => {
    const fake = fakeConnection()
    vi.spyOn(fake.connection, 'progressTracker').mockRejectedValue(
      new BrowserPageError('The server is down.'),
    )
    renderApp(`/${exportPad}/progress-tracker`, fake)
    expect(screen.getByRole('status').textContent).toBe('Loading…')
    expect((await screen.findByRole('note')).textContent).toBe('The server is down.')
  })

  it('shows loading while the log of decisions is read', () => {
    renderApp(`/${exportPad}/decisions`)
    expect(screen.getByRole('status').textContent).toBe('Loading…')
  })
})

describe('ScratchPadApp settings', () => {
  it('switches to the dark mode and saves it when Nick presses Dark', async () => {
    renderApp(`/${exportPad}/`)
    await shownPage('Invoice export')
    await userEvent.click(screen.getByRole('button', { name: 'Dark' }))
    expect(document.documentElement.dataset['colourMode']).toBe('dark')
    expect(window.localStorage.getItem('scratch-pad-colour-mode')).toBe('dark')
  })

  it('starts in the dark mode when the system prefers dark and nothing is saved', async () => {
    renderApp(`/${exportPad}/`, fakeConnection(), true)
    await shownPage('Invoice export')
    expect(document.documentElement.dataset['colourMode']).toBe('dark')
  })

  it('collapses the sidebar and saves it when Nick presses the button at the bottom of the sidebar', async () => {
    const { container } = renderApp(`/${exportPad}/`)
    await shownPage('Invoice export')
    await userEvent.click(screen.getByRole('button', { name: 'Collapse the sidebar' }))
    expect(container.firstElementChild?.getAttribute('data-sidebar')).toBe('collapsed')
    expect(window.localStorage.getItem('scratch-pad-sidebar')).toBe('collapsed')
  })

  it('collapses the sidebar when Nick clicks the scrim beside the open sidebar', async () => {
    const { container } = renderApp(`/${exportPad}/`)
    await shownPage('Invoice export')
    fireEvent.click(screen.getByLabelText('Close the sidebar'))
    expect(container.firstElementChild?.getAttribute('data-sidebar')).toBe('collapsed')
  })

  it('starts with the sidebar collapsed without saving it when the window is narrow', async () => {
    const { container } = renderApp(`/${exportPad}/`, fakeConnection(), false, true)
    await shownPage('Invoice export')
    expect(container.firstElementChild?.getAttribute('data-sidebar')).toBe('collapsed')
    expect(window.localStorage.getItem('scratch-pad-sidebar')).toBeNull()
  })
})
