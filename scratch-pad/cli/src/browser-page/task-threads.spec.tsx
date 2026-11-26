import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  exportPad,
  exportPadAddresses,
  exportedPadJson,
  fakeConnection,
  fakeNarrowWindow,
} from './browser-page-fixtures'
import { bankDetailsThread } from './pad-thread-fixtures'
import { exportedScratchPad } from './exported-scratch-pad'
import { exportedAddresses } from './browser-route'
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

// The fake returns the thread on subtask 2.2 with the other threads of the scratch pad.
function withBankDetailsThread() {
  const fake = fakeConnection()
  fake.threads.set('progress-tracker', [bankDetailsThread])
  return fake
}

async function bubble(): Promise<HTMLElement> {
  return screen.findByRole('button', { name: 'Thread on subtask 2.2' })
}

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
})

describe('the thread of a task on the progress tracker', () => {
  it('shows a speech bubble only on the row of the subtask that is assigned to Nick', async () => {
    renderApp(`/${exportPad}/progress-tracker`)
    await bubble()

    expect(screen.getAllByRole('button', { name: /^Thread on/u })).toHaveLength(1)
  })

  it('still shows the speech bubble on the row of a task that has a thread after the task is unassigned', async () => {
    const fake = fakeConnection()
    fake.threads.set('progress-tracker', [
      { ...bankDetailsThread, id: 'c-8', page: undefined, task: 't-3' },
    ])
    renderApp(`/${exportPad}/progress-tracker`, fake)
    await userEvent.click(await screen.findByRole('button', { name: 'Thread on task 3' }))

    const card = screen.getByRole('region', { name: 'Comment c-8' })
    expect(within(card).getByText('Which bank account is it?')).not.toBeNull()
  })

  it('shows the messages of the thread below the row when Nick clicks the speech bubble', async () => {
    renderApp(`/${exportPad}/progress-tracker`, withBankDetailsThread())
    await userEvent.click(await bubble())

    const card = screen.getByRole('region', { name: 'Comment c-7' })
    expect(within(card).getByText('Which bank account is it?')).not.toBeNull()
    expect(within(card).getByText('The account for the shop in Lyon.')).not.toBeNull()
  })

  it('sends the reply of Nick to the thread of the subtask', async () => {
    const fake = renderApp(`/${exportPad}/progress-tracker`, withBankDetailsThread())
    const reply = vi.spyOn(fake.connection, 'replyToThread')
    await userEvent.click(await bubble())
    await userEvent.type(screen.getByRole('textbox', { name: 'Write a reply…' }), 'Thanks.')
    await userEvent.click(screen.getByRole('button', { name: 'Reply' }))

    expect(reply).toHaveBeenCalledWith('c-7', 'Thanks.')
  })

  it('starts the thread of the subtask with the first message of Nick and shows it', async () => {
    const fake = renderApp(`/${exportPad}/progress-tracker`)
    await userEvent.click(await bubble())
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Write a comment…' }),
      'Which shop is it?',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Send' }))

    expect(fake.connection.startTaskThread).toHaveBeenCalledWith('t-5', 'Which shop is it?')
    const card = await screen.findByRole('region', { name: 'Comment c-9' })
    expect(within(card).getByText('Which shop is it?')).not.toBeNull()
  })

  it('closes the box of the first message when Nick cancels it', async () => {
    renderApp(`/${exportPad}/progress-tracker`)
    await userEvent.click(await bubble())
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect([
      screen.queryByRole('textbox', { name: 'Write a comment…' }),
      (await bubble()).getAttribute('aria-expanded'),
    ]).toStrictEqual([null, 'false'])
  })

  it('opens the thread and scrolls to its card when the address points to the thread', async () => {
    renderApp(`/${exportPad}/progress-tracker#c-7`, withBankDetailsThread())
    await screen.findByRole('heading', { level: 1, name: 'Progress tracker' })

    await waitFor(() =>
      expect(
        screen.getByRole('region', { name: 'Comment c-7' }).getAttribute('data-scrolled-into-view'),
      ).toBe('true'),
    )
  })

  it('links the reply of the agent in the Inbox to the thread on the progress tracker', async () => {
    const fake = withBankDetailsThread()
    vi.spyOn(fake.connection, 'nickInbox').mockResolvedValue({
      threads: [bankDetailsThread],
      decisions: [],
    })
    renderApp(`/${exportPad}/index.md`, fake)
    await userEvent.click(await screen.findByRole('button', { name: /Inbox/u }))

    const entry = await screen.findByRole('menuitem', { name: /Which bank account is it/u })
    expect([
      entry.getAttribute('href'),
      within(entry).queryByText('Progress tracker') === null,
    ]).toStrictEqual([`/${exportPad}/progress-tracker#c-7`, false])
  })

  it("doesn't show a speech bubble in the export, which can't start a thread", async () => {
    window.history.replaceState(null, '', '#/progress-tracker')
    render(
      <ScratchPadApp
        pad={exportPad}
        addresses={exportedAddresses(exportPad)}
        connection={exportedScratchPad(exportedPadJson)}
        writing={undefined}
        settings={window.localStorage}
        narrowWindow={fakeNarrowWindow()}
      />,
    )
    await screen.findByRole('heading', { level: 1, name: 'Progress tracker' })

    expect(screen.queryByRole('button', { name: /^Thread on/u })).toBeNull()
  })
})
