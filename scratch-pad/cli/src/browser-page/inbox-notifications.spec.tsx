import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { type NickInbox, type ProgressTracker, type Thread } from './api-responses'
import {
  exportPad,
  exportPadAddresses,
  fakeConnection,
  fakeNarrowWindow,
  indexInbox,
  progressTracker,
  retryQuestion,
  type FakeConnection,
} from './browser-page-fixtures'
import { type DesktopNotifications } from './desktop-notifications'
import { ScratchPadApp } from './scratch-pad-app'

class StoppedServerError extends Error {}

const uploadReply: Thread = {
  ...retryQuestion,
  id: 'c-2',
  messages: [
    { author: 'nick', text: 'Does the upload retry too?', time: '2026-11-20T21:30:00.000Z' },
    { author: 'agent', text: 'Yes. It uses the same limit.', time: '2026-11-20T21:31:00.000Z' },
  ],
}

const taxNumberDecision = {
  page: 'pages/invoice-template.md',
  id: 'd-1',
  line: 12,
  question: 'Does the invoice template show the tax number?',
  time: '2026-11-20T21:30:00.000Z',
  context: undefined,
}

function fakeNotifications(permission: NotificationPermission) {
  const state = { permission, lookingElsewhere: true }
  const notifications = {
    permission: () => state.permission,
    askPermission: vi.fn(() => {
      state.permission = 'granted'
      return Promise.resolve(state.permission)
    }),
    lookingElsewhere: () => state.lookingElsewhere,
    show: vi.fn<(title: string, body: string) => void>(),
  }
  return { state, notifications }
}

function renderPad(fake: FakeConnection, notifications: DesktopNotifications): void {
  window.history.replaceState(null, '', `/${exportPad}/`)
  render(
    <ScratchPadApp
      pad={exportPad}
      addresses={exportPadAddresses}
      connection={fake.connection}
      writing={fake.connection}
      settings={window.localStorage}
      narrowWindow={fakeNarrowWindow()}
      notifications={notifications}
    />,
  )
}

async function openPad(fake: FakeConnection, notifications: DesktopNotifications): Promise<void> {
  renderPad(fake, notifications)
  // The subtask that is assigned to Nick waits for him too.
  await screen.findByRole('button', { name: 'Inbox: 3 items wait for you' })
}

async function inboxChanges(fake: FakeConnection, inbox: NickInbox, count: number): Promise<void> {
  vi.spyOn(fake.connection, 'nickInbox').mockResolvedValue(inbox)
  act(() => fake.sendChange({ kind: 'thread', id: 'c-2' }))
  await screen.findByRole('button', { name: `Inbox: ${count} items wait for you` })
}

// Task 3 "Check the retry limit" is assigned to Nick too.
const withAssignedTask: ProgressTracker = {
  ...progressTracker,
  tasks: progressTracker.tasks.map((task) =>
    task.id === 't-3'
      ? {
          ...task,
          assignment: {
            assignee: 'user',
            do: 'Ask Jo for the limit',
            why: 'Jo only talks to Nick',
          },
        }
      : task,
  ),
}

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
})

describe('the desktop notifications of the Inbox', () => {
  it('shows a notification for a reply that starts to wait after the page has opened', async () => {
    const fake = fakeConnection()
    const { notifications } = fakeNotifications('granted')
    await openPad(fake, notifications)
    await inboxChanges(fake, { ...indexInbox, threads: [retryQuestion, uploadReply] }, 4)
    await waitFor(() =>
      expect(notifications.show.mock.calls).toStrictEqual([
        ['Invoice export', 'The agent replied: Yes. It uses the same limit.'],
      ]),
    )
  })

  it('shows a notification for a task that the agent assigns to Nick after the page has opened', async () => {
    const fake = fakeConnection()
    const { notifications } = fakeNotifications('granted')
    await openPad(fake, notifications)
    vi.spyOn(fake.connection, 'progressTracker').mockResolvedValue(withAssignedTask)
    act(() => fake.sendChange({ kind: 'progress-tracker' }))
    await screen.findByRole('button', { name: 'Inbox: 4 items wait for you' })
    await waitFor(() =>
      expect(notifications.show.mock.calls).toStrictEqual([
        ['Invoice export', 'Assigned to you: 3 Check the retry limit'],
      ]),
    )
  })

  it("doesn't show a notification for the tasks that were assigned before the progress tracker was first loaded", async () => {
    const fake = fakeConnection()
    const { notifications } = fakeNotifications('granted')
    const loaded = Promise.withResolvers<ProgressTracker>()
    vi.spyOn(fake.connection, 'progressTracker').mockReturnValue(loaded.promise)
    renderPad(fake, notifications)
    await screen.findByRole('button', { name: 'Inbox: 2 items wait for you' })
    act(() => loaded.resolve(withAssignedTask))
    await screen.findByRole('button', { name: 'Inbox: 4 items wait for you' })
    expect(notifications.show).not.toHaveBeenCalled()
  })

  it('shows a notification for a reply when the progress tracker can’t be loaded', async () => {
    const fake = fakeConnection()
    const { notifications } = fakeNotifications('granted')
    vi.spyOn(fake.connection, 'progressTracker').mockRejectedValue(
      new StoppedServerError('The server has stopped.'),
    )
    renderPad(fake, notifications)
    await screen.findByRole('button', { name: 'Inbox: 2 items wait for you' })
    await inboxChanges(fake, { ...indexInbox, threads: [retryQuestion, uploadReply] }, 3)
    await waitFor(() =>
      expect(notifications.show.mock.calls).toStrictEqual([
        [exportPad, 'The agent replied: Yes. It uses the same limit.'],
      ]),
    )
  })

  it('shows a notification for the new item when another item is resolved at the same time', async () => {
    const fake = fakeConnection()
    const { notifications } = fakeNotifications('granted')
    await openPad(fake, notifications)
    await inboxChanges(fake, { ...indexInbox, threads: [uploadReply] }, 3)
    await waitFor(() =>
      expect(notifications.show.mock.calls).toStrictEqual([
        ['Invoice export', 'The agent replied: Yes. It uses the same limit.'],
      ]),
    )
  })

  it('shows a notification when the agent writes another message on a thread that already waits for Nick', async () => {
    const fake = fakeConnection()
    const { notifications } = fakeNotifications('granted')
    await openPad(fake, notifications)
    const withSecondMessage: Thread = {
      ...retryQuestion,
      messages: [
        ...retryQuestion.messages,
        {
          author: 'agent',
          text: 'The upload retries 8 times too.',
          time: '2026-11-20T21:40:00.000Z',
        },
      ],
    }
    await inboxChanges(fake, { ...indexInbox, threads: [withSecondMessage] }, 3)
    await waitFor(() =>
      expect(notifications.show.mock.calls).toStrictEqual([
        ['Invoice export', 'The agent replied: The upload retries 8 times too.'],
      ]),
    )
  })

  it('shows a notification when Nick and the agent both reply before the Inbox has been loaded again', async () => {
    const fake = fakeConnection()
    const { notifications } = fakeNotifications('granted')
    await openPad(fake, notifications)
    const bothReplied: Thread = {
      ...retryQuestion,
      messages: [
        ...retryQuestion.messages,
        { author: 'nick', text: 'Can a shop ask for 10?', time: '2026-11-20T21:20:00.000Z' },
        { author: 'agent', text: 'Yes. The limit is 10.', time: '2026-11-20T21:25:00.000Z' },
      ],
    }
    vi.spyOn(fake.connection, 'nickInbox')
      .mockReturnValueOnce(new Promise<NickInbox>(() => undefined))
      .mockResolvedValue({ ...indexInbox, threads: [bothReplied] })
    act(() => fake.sendChange({ kind: 'thread', id: 'c-1' }))
    act(() => fake.sendChange({ kind: 'thread', id: 'c-1' }))
    await waitFor(() =>
      expect(notifications.show.mock.calls).toStrictEqual([
        ['Invoice export', 'The agent replied: Yes. The limit is 10.'],
      ]),
    )
    expect(fake.connection.nickInbox).toHaveBeenCalledTimes(2)
  })

  it('shows a notification for a decision on another page when its id is the same as the id of a waiting decision', async () => {
    const fake = fakeConnection()
    const { notifications } = fakeNotifications('granted')
    await openPad(fake, notifications)
    await inboxChanges(
      fake,
      { ...indexInbox, decisions: [...indexInbox.decisions, taxNumberDecision] },
      3,
    )
    await waitFor(() =>
      expect(notifications.show.mock.calls).toStrictEqual([
        ['Invoice export', 'A decision to make: Does the invoice template show the tax number?'],
      ]),
    )
  })

  it('shows the number of the new items when several items start to wait at the same time', async () => {
    const fake = fakeConnection()
    const { notifications } = fakeNotifications('granted')
    await openPad(fake, notifications)
    const withoutMessages = { ...retryQuestion, id: 'c-3', messages: [] }
    await inboxChanges(
      fake,
      {
        threads: [retryQuestion, uploadReply, withoutMessages],
        decisions: [...indexInbox.decisions, taxNumberDecision],
      },
      5,
    )
    await waitFor(() =>
      expect(notifications.show.mock.calls).toStrictEqual([
        ['Invoice export', '2 new items wait for you.'],
      ]),
    )
  })

  it('only shows a notification for an item that starts to wait while Nick is looking elsewhere', async () => {
    const fake = fakeConnection()
    const { state, notifications } = fakeNotifications('granted')
    await openPad(fake, notifications)
    state.lookingElsewhere = false
    await inboxChanges(fake, { ...indexInbox, threads: [retryQuestion, uploadReply] }, 4)
    state.lookingElsewhere = true
    await inboxChanges(
      fake,
      {
        threads: [retryQuestion, uploadReply],
        decisions: [...indexInbox.decisions, taxNumberDecision],
      },
      5,
    )
    await waitFor(() =>
      expect(notifications.show.mock.calls).toStrictEqual([
        ['Invoice export', 'A decision to make: Does the invoice template show the tax number?'],
      ]),
    )
  })
})

describe('the button for the desktop notifications', () => {
  it('asks for the permission when Nick clicks the button and then only notifies the items that start to wait after that', async () => {
    const fake = fakeConnection()
    const { notifications } = fakeNotifications('default')
    await openPad(fake, notifications)
    await inboxChanges(fake, { ...indexInbox, threads: [retryQuestion, uploadReply] }, 4)
    await userEvent.click(screen.getByRole('button', { name: 'Turn on desktop notifications' }))
    await screen.findByRole('button', { name: 'Desktop notifications are on' })
    await inboxChanges(
      fake,
      {
        threads: [retryQuestion, uploadReply],
        decisions: [...indexInbox.decisions, taxNumberDecision],
      },
      5,
    )
    expect(notifications.askPermission).toHaveBeenCalledWith()
    await waitFor(() =>
      expect(notifications.show.mock.calls).toStrictEqual([
        ['Invoice export', 'A decision to make: Does the invoice template show the tax number?'],
      ]),
    )
  })

  it('reads the permission again when the focus comes back to the window after Nick has changed the permission in the browser', async () => {
    const { state, notifications } = fakeNotifications('default')
    await openPad(fakeConnection(), notifications)
    state.permission = 'denied'
    act(() => {
      window.dispatchEvent(new Event('focus'))
    })
    expect(
      screen.getByRole('button', { name: 'The browser blocks desktop notifications' }).title,
    ).toBe('The browser blocks desktop notifications')
  })

  it('shows that the browser blocks the notifications when Nick has blocked them', async () => {
    const { notifications } = fakeNotifications('denied')
    await openPad(fakeConnection(), notifications)
    expect(
      screen.getByRole('button', { name: 'The browser blocks desktop notifications' }).title,
    ).toBe('The browser blocks desktop notifications')
  })
})
