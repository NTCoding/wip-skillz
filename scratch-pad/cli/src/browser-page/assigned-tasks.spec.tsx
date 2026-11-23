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
