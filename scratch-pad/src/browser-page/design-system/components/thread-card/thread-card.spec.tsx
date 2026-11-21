import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ThreadCard, type ThreadMessage, type ThreadState } from './thread-card'

class ClosedThreadError extends Error {}

const question: ThreadMessage = {
  author: 'nick',
  text: 'Is 5 retries enough?',
  time: '2026-11-20T21:09:00.000Z',
  shownTime: '20 Nov, 21:09',
}

const answer: ThreadMessage = {
  author: 'agent',
  text: 'I have raised the limit to 8.',
  time: '2026-11-20T21:12:00.000Z',
  shownTime: '20 Nov, 21:12',
}

interface CardOptions {
  readonly state?: ThreadState
  readonly onReply?: (text: string) => Promise<void>
  readonly onResolve?: () => Promise<void>
  readonly kind?: 'comment' | 'grammar' | 'improvement'
  readonly readOnly?: boolean
  readonly messages?: readonly ThreadMessage[]
}

function renderCard(options: CardOptions = {}) {
  render(
    <ThreadCard
      id="c-1"
      kind={options.kind ?? 'comment'}
      messages={options.messages ?? [question, answer]}
      state={options.state ?? 'waits-for-nick'}
      outcome={options.state === 'resolved' ? 'Raised the limit to 8.' : undefined}
      textChanged={true}
      active={false}
      onActivate={() => undefined}
      onReply={
        options.readOnly === true ? undefined : (options.onReply ?? (() => Promise.resolve()))
      }
      onResolve={
        options.readOnly === true ? undefined : (options.onResolve ?? (() => Promise.resolve()))
      }
    />,
  )
  return screen.getByRole('region')
}

describe('ThreadCard', () => {
  it('shows each message with its author and its time and the state when the agent has replied', () => {
    const card = renderCard()
    const messages = within(card).getAllByRole('listitem')
    expect(messages.map((message) => message.textContent)).toStrictEqual([
      'NNick20 Nov, 21:09Is 5 retries enough?',
      'AAgent20 Nov, 21:12I have raised the limit to 8.',
    ])
    expect(card.querySelector('time')?.getAttribute('dateTime')).toBe(question.time)
    expect(within(card).getByText('The agent replied').getAttribute('data-state')).toBe(
      'waits-for-nick',
    )
  })

  it('sends Nick’s reply when Nick writes in the reply box', async () => {
    const onReply = vi.fn<(text: string) => Promise<void>>(() => Promise.resolve())
    renderCard({ onReply })
    await userEvent.type(screen.getByRole('textbox', { name: 'Write a reply…' }), 'Thanks{Enter}')
    expect(onReply).toHaveBeenCalledWith('Thanks')
  })

  it('calls onResolve when Nick presses the resolve button', async () => {
    const onResolve = vi.fn(() => Promise.resolve())
    renderCard({ onResolve })
    await userEvent.click(screen.getByRole('button', { name: 'Resolve c-1' }))
    expect(onResolve).toHaveBeenCalledWith()
  })

  it('shows the problem when the server doesn’t resolve the thread', async () => {
    renderCard({ onResolve: () => Promise.reject(new ClosedThreadError('c-1 is closed.')) })
    await userEvent.click(screen.getByRole('button', { name: 'Resolve c-1' }))
    expect((await screen.findByRole('alert')).textContent).toBe('c-1 is closed.')
  })

  it('shows the first message and the outcome when the thread is resolved', () => {
    const card = renderCard({ state: 'resolved', kind: 'improvement' })
    expect(within(card).getAllByRole('listitem')).toHaveLength(1)
    expect(card.textContent).toContain('Done: Raised the limit to 8.')
  })

  it('sends Nick’s reply, which reopens the thread, when Nick writes in the box of a resolved thread', async () => {
    const onReply = vi.fn<(text: string) => Promise<void>>(() => Promise.resolve())
    renderCard({ state: 'resolved', onReply })
    await userEvent.type(screen.getByRole('textbox', { name: 'Reply to reopen…' }), 'Why 8?')
    await userEvent.click(screen.getByRole('button', { name: 'Reopen' }))
    expect(onReply).toHaveBeenCalledWith('Why 8?')
  })

  it('doesn’t show a reply box when the resolved thread is read only', () => {
    const card = renderCard({ state: 'resolved', readOnly: true })
    expect(within(card).queryByRole('textbox')).toBeNull()
  })

  it('doesn’t warn that the text has changed when the thread is resolved', () => {
    const card = renderCard({ state: 'resolved', kind: 'grammar' })
    expect(card.textContent).not.toContain('The text has changed')
  })

  it('shows every message when Nick opens the replies of a resolved thread', async () => {
    const card = renderCard({ state: 'resolved' })
    await userEvent.click(within(card).getByRole('button', { name: 'Show 1 more message' }))
    expect(
      within(card)
        .getAllByRole('listitem')
        .map((message) => message.textContent),
    ).toStrictEqual([
      'NNick20 Nov, 21:09Is 5 retries enough?',
      'AAgent20 Nov, 21:12I have raised the limit to 8.',
    ])
  })

  it('counts the hidden messages when a resolved thread has more than one reply', () => {
    const card = renderCard({ state: 'resolved', messages: [question, answer, question] })
    expect(within(card).getByRole('button', { name: 'Show 2 more messages' }).textContent).toBe(
      'Show 2 more messages',
    )
  })

  it('doesn’t show a button for more messages when a resolved thread has only one message', () => {
    const card = renderCard({ state: 'resolved', messages: [question] })
    expect(within(card).queryByRole('button', { name: /more message/ })).toBeNull()
  })

  it('warns that the text has changed when the thread is open', () => {
    expect(renderCard().textContent).toContain('The text has changed')
  })

  it('shows only the first message again when Nick hides the replies of a resolved thread', async () => {
    const card = renderCard({ state: 'resolved', readOnly: true })
    await userEvent.click(within(card).getByRole('button', { name: 'Show 1 more message' }))
    await userEvent.click(within(card).getByRole('button', { name: 'Hide the replies' }))
    expect(within(card).getAllByRole('listitem')).toHaveLength(1)
  })

  it('shows every message without a reply box or a resolve button when the card is read only', () => {
    const card = renderCard({ readOnly: true })
    expect(within(card).getAllByRole('listitem')).toHaveLength(2)
    expect(within(card).queryByRole('textbox')).toBeNull()
    expect(within(card).queryByRole('button', { name: 'Resolve c-1' })).toBeNull()
  })
})
