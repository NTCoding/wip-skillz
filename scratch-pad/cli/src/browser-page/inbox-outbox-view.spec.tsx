import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type ThreadOfPad } from './api-responses'
import {
  exportPad,
  exportPadAddresses,
  fakeConnection,
  fakeNarrowWindow,
  retryQuestion,
  toneNote,
  type FakeConnection,
} from './browser-page-fixtures'
import { queuedComment, queuedReply } from './outbox-fixtures'
import { ScratchPadApp } from './scratch-pad-app'

const now = '2026-11-20T22:00:00.000Z'

function comment(id: string, overrides: Partial<ThreadOfPad>): ThreadOfPad {
  return { ...retryQuestion, id, resolvedTime: undefined, ...overrides }
}

const lateComment = comment('c-2', {
  page: 'pages/invoice-template.md',
  anchor: { firstLine: 9, lastLine: 9, selectedText: 'one page', prefix: 'has', suffix: '.' },
  position: { kind: 'detached' },
  waitsFor: 'agent',
  messages: [{ author: 'nick', text: 'Is one page enough?', time: '2026-11-20T21:30:00.000Z' }],
})

const newComment = comment('c-3', {
  waitsFor: 'agent',
  messages: [
    ...retryQuestion.messages,
    { author: 'nick', text: 'And for a big shop?', time: '2026-11-20T21:58:00.000Z' },
  ],
})

const resolvedYesterday = comment('c-4', {
  waitsFor: 'nobody',
  resolvedTime: '2026-11-19T20:00:00.000Z',
})

const resolvedBefore = comment('c-5', { waitsFor: 'nobody' })

const resolvedToday = comment('c-7', {
  waitsFor: 'nobody',
  resolvedTime: '2026-11-20T21:00:00.000Z',
})

const threadsOfPad: ThreadOfPad[] = [
  { ...retryQuestion, resolvedTime: undefined },
  { ...toneNote, resolvedTime: undefined },
  resolvedBefore,
  lateComment,
  newComment,
  resolvedYesterday,
  resolvedToday,
  comment('c-6', { waitsFor: 'agent', messages: [] }),
]

function fakeWithEveryStatus(): FakeConnection {
  const fake = fakeConnection()
  fake.readMarks.push({
    page: 'pages/first-retry.md',
    state: 'new',
    changedTime: '2026-11-20T21:40:00.000Z',
    sections: [],
    changedSections: [],
  })
  fake.outbox.push(
    queuedComment,
    queuedReply,
    { ...queuedReply, number: 3, thread: 'c-9' },
    { ...queuedComment, number: 4, position: { kind: 'detached' } },
  )
  vi.spyOn(fake.connection, 'threadsOfPad').mockResolvedValue(threadsOfPad)
  return fake
}

async function renderView(fake: FakeConnection = fakeWithEveryStatus()) {
  window.history.replaceState(null, '', `/${exportPad}/inbox-outbox`)
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
  await screen.findByRole('heading', { level: 1, name: 'Inbox / Outbox' })
  return fake
}

function pills(): string[] {
  return within(screen.getByRole('group', { name: 'Show' }))
    .getAllByRole('button')
    .map((pill) => String(pill.textContent))
}

function rowsOf(name: string): string[] {
  return within(screen.getByRole('list', { name }))
    .getAllByRole('listitem')
    .map((row) => String(row.textContent))
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(now))
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('the Inbox / Outbox view', () => {
  it('shows every item under the heading of its status with a count on each filter', async () => {
    await renderView()
    await screen.findByRole('list', { name: 'Waiting for the agent' })

    expect(pills()).toStrictEqual([
      'All11',
      'Waiting for you3',
      'Waiting for the agent2',
      'In the outbox3',
      'Resolved3',
    ])
    expect(
      screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent),
    ).toStrictEqual(['Waiting for you3', 'Waiting for the agent2', 'In the outbox3', 'Resolved3'])
    expect(rowsOf('Waiting for you')).toStrictEqual([
      'A new page20 Nov, 21:40retry-limit.md › 2.1.1 First retryThe first retry waits 30 seconds.Open the page',
      'A decision to makeInvoice exportWill the export job retry 8 times?Open the decision',
      'The agent replied20 Nov, 21:12Invoice exportretries 5 timesAgent: I have raised the limit to 8.Open the thread',
    ])
  })

  it('shows the comments that wait for the agent, the longest first, with the late one highlighted', async () => {
    await renderView()
    fireEvent.click(await screen.findByRole('button', { name: /^Waiting for the agent/ }))

    expect(rowsOf('Items')).toStrictEqual([
      'Sent, no reply yetSent 30 min agoInvoice template › The tax numberone pageNick: Is one page enough?Open the thread',
      'Sent, no reply yetSent 2 min agoInvoice exportretries 5 timesNick: And for a big shop?Open the thread',
    ])
    expect(screen.getByText('Sent 30 min ago').dataset['late']).toBe('true')
    expect(screen.getByText('Sent 2 min ago').dataset['late']).toBe('false')
    expect(
      screen.getByRole('button', { name: /^Waiting for the agent/ }).getAttribute('aria-pressed'),
    ).toBe('true')
  })

  it('shows the comments and replies in the outbox and leaves out a reply to a thread that it can’t find', async () => {
    await renderView()
    fireEvent.click(await screen.findByRole('button', { name: /^In the outbox/ }))

    expect(rowsOf('Items')).toStrictEqual([
      'In the outboxNot sent yetInvoice exportpaid invoicesNick: Only the paid ones?Open the thread',
      'In the outboxNot sent yetInvoice exportretries 5 timesNick: Can a shop ask for 10?Open the thread',
      'In the outboxNot sent yetInvoice exportpaid invoicesNick: Only the paid ones?Open the thread',
    ])
    expect(
      screen
        .getAllByRole('link', { name: 'Open the thread' })
        .map((link) => link.getAttribute('href')),
    ).toStrictEqual([`/${exportPad}/#outbox-1`, `/${exportPad}/#c-1`, `/${exportPad}/#outbox-4`])
  })

  it('shows the resolved comments, the newest first, and a comment without the time it was resolved last', async () => {
    await renderView()
    fireEvent.click(await screen.findByRole('button', { name: /^Resolved/ }))

    expect(rowsOf('Items').map((row) => row.slice(0, 26))).toStrictEqual([
      'ResolvedResolved 1 hour ag',
      'ResolvedResolved yesterday',
      'ResolvedResolvedInvoice ex',
    ])
  })

  it('says that there aren’t any items when the filter doesn’t match any item', async () => {
    const fake = fakeConnection()
    vi.spyOn(fake.connection, 'threadsOfPad').mockResolvedValue([])
    await renderView(fake)
    fireEvent.click(await screen.findByRole('button', { name: /^In the outbox/ }))

    expect(screen.getByText('There aren’t any items here.')).not.toBeNull()
  })

  it('opens the thread when Nick clicks the link of a row', async () => {
    await renderView()
    fireEvent.click(await screen.findByRole('button', { name: /^Waiting for the agent/ }))
    fireEvent.click(screen.getAllByRole('link', { name: 'Open the thread' })[0] ?? document.body)

    expect(window.location.pathname).toBe(`/${exportPad}/invoice-template.md`)
    expect(window.location.hash).toBe('#c-2')
  })

  it('is the current view in the sidebar and in the breadcrumb', async () => {
    await renderView()

    expect(screen.getByRole('link', { name: 'Inbox / Outbox' }).getAttribute('aria-current')).toBe(
      'page',
    )
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' }).textContent).toContain(
      'Inbox / Outbox',
    )
  })

  it('updates how long ago each comment was sent every minute', async () => {
    const setInterval = vi.spyOn(window, 'setInterval')
    await renderView()
    fireEvent.click(await screen.findByRole('button', { name: /^Waiting for the agent/ }))
    const [tick] = setInterval.mock.calls.find(([, delay]) => delay === 60_000) ?? []

    vi.setSystemTime(new Date('2026-11-20T22:10:00.000Z'))
    act(() => {
      if (typeof tick === 'function') {
        tick()
      }
    })

    expect(screen.getByText('Sent 12 min ago').dataset['late']).toBe('false')
    expect(screen.getByText('Sent 40 min ago').dataset['late']).toBe('true')
  })
})
