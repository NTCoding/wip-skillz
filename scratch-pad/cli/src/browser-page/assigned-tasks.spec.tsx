import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { type ProgressTracker } from './api-responses'
import {
  exportPad,
  exportPadAddresses,
  fakeConnection,
  fakeNarrowWindow,
  progressTracker,
} from './browser-page-fixtures'
import { ScratchPadApp } from './scratch-pad-app'

function renderApp(path: string, fake = fakeConnection()) {
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

// Subtask 2.2 "Show the bank details" is assigned to Nick in the fixture. Here it has a
// description too.
const withDescription: ProgressTracker = {
  ...progressTracker,
  tasks: progressTracker.tasks.map((task) => ({
    ...task,
    subtasks: task.subtasks.map((subtask) =>
      subtask.id === 't-5'
        ? { ...subtask, html: '<p>The IBAN is on the contract.</p>\n' }
        : subtask,
    ),
  })),
}

// Subtask 2.2 is done, which Nick has marked in the Inbox.
const withSubtaskDone: ProgressTracker = {
  ...progressTracker,
  tasks: progressTracker.tasks.map((task) => ({
    ...task,
    subtasks: task.subtasks.map((subtask) =>
      subtask.id === 't-5' ? { ...subtask, state: 'done' } : subtask,
    ),
  })),
}

// What Nick has to do for subtask 2.2 has a link to a section of the retry limit, a link to
// another site and a bare URL. The HTML and the links are in the format that is returned by the
// server.
const withLinks: ProgressTracker = {
  ...progressTracker,
  tasks: progressTracker.tasks.map((task) => ({
    ...task,
    subtasks: task.subtasks.map((subtask) =>
      subtask.assignment === undefined
        ? subtask
        : {
            ...subtask,
            assignment: {
              ...subtask.assignment,
              doHtml:
                '<p>Reply on <a href="retry-limit.md#the-limit">the limit</a>. Read <a href="https://x.dev/iban">the IBAN guide</a> at <a href="https://x.dev/a">https://x.dev/a</a>.</p>\n',
              links: [
                {
                  kind: 'page',
                  href: 'retry-limit.md#the-limit',
                  page: 'pages/retry-limit.md',
                  headingId: 'the-limit',
                },
                { kind: 'other', href: 'https://x.dev/iban' },
                { kind: 'other', href: 'https://x.dev/a' },
              ],
            },
          },
    ),
  })),
}

function subtaskRow(): HTMLElement {
  return screen.getByRole('button', { name: /Show the bank details/ })
}

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
})

describe('a task that is assigned to Nick on the progress tracker', () => {
  it('opens the row of an assigned subtask and scrolls to it when the address points to the subtask', async () => {
    renderApp(`/${exportPad}/progress-tracker#t-5`)
    await screen.findByRole('heading', { level: 1, name: 'Progress tracker' })

    await waitFor(() => expect(subtaskRow().getAttribute('data-scrolled-into-view')).toBe('true'))
    expect([subtaskRow().id, subtaskRow().getAttribute('aria-expanded')]).toStrictEqual([
      't-5',
      'true',
    ])
    expect(screen.getByText('Ask the bank for the IBAN of the shop')).not.toBeNull()
  })

  it('shows the links in what Nick has to do and opens a link to a page in the scratch pad', async () => {
    const fake = fakeConnection()
    vi.spyOn(fake.connection, 'progressTracker').mockResolvedValue(withLinks)
    renderApp(`/${exportPad}/progress-tracker#t-5`, fake)
    const external = [
      await screen.findByRole('link', { name: 'the IBAN guide' }),
      screen.getByRole('link', { name: 'https://x.dev/a' }),
    ].map((link) => [link.getAttribute('href'), link.getAttribute('target')])
    await userEvent.click(screen.getByRole('link', { name: 'the limit' }))

    expect([external, window.location.pathname, window.location.hash]).toStrictEqual([
      [
        ['https://x.dev/iban', '_blank'],
        ['https://x.dev/a', '_blank'],
      ],
      `/${exportPad}/retry-limit.md`,
      '#the-limit',
    ])
  })

  it('gives the description of an assigned subtask its own anchor and opens it from the link in the details', async () => {
    const fake = fakeConnection()
    vi.spyOn(fake.connection, 'progressTracker').mockResolvedValue(withDescription)
    renderApp(`/${exportPad}/progress-tracker#t-5`, fake)
    await userEvent.click(await screen.findByRole('link', { name: 'Read the description' }))

    const heading = screen.getByRole('heading', { level: 3, name: '2.2 Show the bank details' })
    expect([window.location.hash, heading.id, heading.closest('details')?.open]).toStrictEqual([
      '#t-5-description',
      't-5-description',
      true,
    ])
  })

  it('keeps the row of an assigned subtask open when Nick follows the link to its description', async () => {
    const fake = fakeConnection()
    vi.spyOn(fake.connection, 'progressTracker').mockResolvedValue(withDescription)
    renderApp(`/${exportPad}/progress-tracker`, fake)
    await userEvent.click(await screen.findByRole('button', { name: /Show the bank details/ }))
    await userEvent.click(screen.getByRole('link', { name: 'Read the description' }))

    expect([
      window.location.hash,
      subtaskRow().getAttribute('aria-expanded'),
      screen.getByText('Ask the bank for the IBAN of the shop').isConnected,
    ]).toStrictEqual(['#t-5-description', 'true', true])
  })
})

describe('a task that is assigned to Nick in the Inbox', () => {
  it('opens the row of the subtask on the progress tracker when Nick chooses the subtask', async () => {
    renderApp(`/${exportPad}/`)
    await userEvent.click(
      await screen.findByRole('button', { name: 'Inbox: 3 items wait for you' }),
    )
    await userEvent.click(screen.getByRole('menuitem', { name: /^2.2 Show the bank details/ }))

    await screen.findByRole('heading', { level: 1, name: 'Progress tracker' })
    expect([window.location.pathname, window.location.hash]).toStrictEqual([
      `/${exportPad}/progress-tracker`,
      '#t-5',
    ])
    expect(subtaskRow().getAttribute('aria-expanded')).toBe('true')
  })

  it('opens the page and the section of a link in the first line of what Nick has to do', async () => {
    const fake = fakeConnection()
    vi.spyOn(fake.connection, 'progressTracker').mockResolvedValue(withLinks)
    renderApp(`/${exportPad}/`, fake)
    await userEvent.click(await screen.findByRole('button', { name: /^Inbox/u }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'the limit' }))

    expect([window.location.pathname, window.location.hash]).toStrictEqual([
      `/${exportPad}/retry-limit.md`,
      '#the-limit',
    ])
  })

  it('opens the links to other sites in the first line of what Nick has to do in a new tab', async () => {
    const fake = fakeConnection()
    vi.spyOn(fake.connection, 'progressTracker').mockResolvedValue(withLinks)
    renderApp(`/${exportPad}/`, fake)
    await userEvent.click(await screen.findByRole('button', { name: /^Inbox/u }))

    expect(
      ['the IBAN guide', 'https://x.dev/a'].map((name) => {
        const link = screen.getByRole('menuitem', { name })
        return [link.getAttribute('href'), link.getAttribute('target')]
      }),
    ).toStrictEqual([
      ['https://x.dev/iban', '_blank'],
      ['https://x.dev/a', '_blank'],
    ])
  })

  it('still opens the subtask from the title of an entry whose first line has links', async () => {
    const fake = fakeConnection()
    vi.spyOn(fake.connection, 'progressTracker').mockResolvedValue(withLinks)
    renderApp(`/${exportPad}/`, fake)
    await userEvent.click(await screen.findByRole('button', { name: /^Inbox/u }))
    await userEvent.click(
      screen.getByRole('menuitem', {
        name: '2.2 Show the bank details',
        description: 'In progress Reply on the limit. Read the IBAN guide at https://x.dev/a.',
      }),
    )

    await screen.findByRole('heading', { level: 1, name: 'Progress tracker' })
    expect([window.location.pathname, window.location.hash]).toStrictEqual([
      `/${exportPad}/progress-tracker`,
      '#t-5',
    ])
  })

  it('shows the links of the first line on the Inbox / Outbox page and opens a page from one of them', async () => {
    const fake = fakeConnection()
    vi.spyOn(fake.connection, 'progressTracker').mockResolvedValue(withLinks)
    renderApp(`/${exportPad}/inbox-outbox`, fake)
    const external = await screen.findByRole('link', { name: 'the IBAN guide' })
    await userEvent.click(screen.getByRole('link', { name: 'the limit' }))

    expect([
      external.getAttribute('target'),
      window.location.pathname,
      window.location.hash,
    ]).toStrictEqual(['_blank', `/${exportPad}/retry-limit.md`, '#the-limit'])
  })

  it('marks the subtask as done and loads the progress tracker again when Nick clicks its button', async () => {
    const fake = renderApp(`/${exportPad}/`)
    await userEvent.click(
      await screen.findByRole('button', { name: 'Inbox: 3 items wait for you' }),
    )
    vi.spyOn(fake.connection, 'progressTracker').mockResolvedValue(withSubtaskDone)
    await userEvent.click(
      screen.getByRole('menuitem', { name: 'Mark as done: 2.2 Show the bank details' }),
    )

    expect(fake.connection.markTaskDone).toHaveBeenCalledWith('t-5')
    await screen.findByRole('button', { name: 'Inbox: 2 items wait for you' })
  })
})
