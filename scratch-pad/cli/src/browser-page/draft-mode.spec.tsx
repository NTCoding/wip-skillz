import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  exportPad,
  exportPadAddresses,
  fakeConnection,
  fakeNarrowWindow,
  type FakeConnection,
} from './browser-page-fixtures'
import { ScratchPadApp } from './scratch-pad-app'
import { scratchPadConnection } from './scratch-pad-connection'

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

beforeEach(() => {
  window.localStorage.clear()
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
})

describe('draft mode', () => {
  it('shows the outbox by default when draft mode is on and hides it when toggled off', async () => {
    const fake = fakeConnection()
    renderApp(`/${exportPad}/`, fake)
    await screen.findByRole('region', { name: 'Comment c-1' })

    expect(screen.getByRole('button', { name: /^Outbox/ })).toBeDefined()

    const queueDecision = vi.spyOn(fake.connection, 'queueDecision')
    await userEvent.click(screen.getByRole('button', { name: 'Proposal' }))
    expect(queueDecision).toHaveBeenCalledWith('d-1', 'pages/index.md', { choice: 'proposal' })

    const toggle = screen.getByRole('switch', { name: 'Draft mode' })
    await userEvent.click(toggle)
    expect(screen.queryByRole('button', { name: /^Outbox/ })).toBeNull()

    await userEvent.click(toggle)
    expect(screen.getByRole('button', { name: /^Outbox/ })).toBeDefined()
  })

  it('shows queued decisions in the outbox panel and on the Inbox / Outbox view', async () => {
    const fake = fakeConnection()
    fake.outbox.push(
      {
        kind: 'decision',
        number: 1,
        decision: 'd-1',
        page: 'pages/index.md',
        line: 5,
        question: 'Raise the retry limit?',
        answer: { choice: 'proposal' },
        chosenOption: 'Raise to 8',
        time: '2026-11-20T21:14:00.000Z',
      },
      {
        kind: 'decision',
        number: 2,
        decision: 'd-2',
        page: 'pages/index.md',
        line: 8,
        question: 'Keep empty files?',
        answer: { choice: 'alternative' },
        chosenOption: undefined,
        time: '2026-11-20T21:15:00.000Z',
      },
      {
        kind: 'decision',
        number: 3,
        decision: 'd-3',
        page: 'pages/index.md',
        line: 10,
        question: 'Which format?',
        answer: { written: 'Use CSV' },
        chosenOption: undefined,
        time: '2026-11-20T21:16:00.000Z',
      },
    )
    renderApp(`/${exportPad}/inbox-outbox`, fake)
    expect(await screen.findByText('Nick: Raise to 8')).toBeDefined()
    expect(screen.getByText('Nick: alternative')).toBeDefined()
    expect(screen.getByText('Nick: Use CSV')).toBeDefined()
  })

  it('posts a queued decision through scratchPadConnection', async () => {
    const fetch = vi.fn(() => Promise.resolve(new Response(JSON.stringify({ items: [] }))))
    const connection = scratchPadConnection(exportPad, {
      fetch,
      openChangeStream: () => ({ addEventListener: vi.fn(), close: vi.fn() }),
    })
    await connection.queueDecision('d-1', 'pages/index.md', { choice: 'proposal' })
    expect(fetch).toHaveBeenCalledWith(
      `/api/scratch-pads/${exportPad}/outbox/decisions/d-1`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ page: 'pages/index.md', choice: 'proposal' }),
      }),
    )
  })
})
