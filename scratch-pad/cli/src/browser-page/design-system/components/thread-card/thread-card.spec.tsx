import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { type ThreadQuote } from '../selected-text-quote/selected-text-quote'
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
  readonly onHide?: () => void
  readonly kind?: 'comment' | 'grammar' | 'improvement'
  readonly readOnly?: boolean
  readonly messages?: readonly ThreadMessage[]
  readonly quote?: ThreadQuote
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
      onHide={options.onHide ?? (() => undefined)}
      quote={options.quote}
    />,
  )
  return screen.getByRole('region')
}

const quote: ThreadQuote = {
  prefix: 'The job ',
  selectedText: 'retries 5 times',
  suffix: ' on a slow network.',
}

async function openFullSize(): Promise<HTMLElement> {
  await userEvent.click(screen.getByRole('button', { name: 'Open c-1 at full size' }))
  return screen.getByRole('dialog')
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

  it('shows the hide button rather than the resolve button on a resolved thread and calls onHide when Nick presses it', async () => {
    const onHide = vi.fn<() => void>()
    const card = renderCard({ state: 'resolved', onHide })
    expect(within(card).queryByRole('button', { name: 'Resolve c-1' })).toBeNull()
    await userEvent.click(within(card).getByRole('button', { name: 'Hide c-1' }))
    expect(onHide).toHaveBeenCalledWith()
  })

  it('shows the resolve button rather than the hide button when the thread is open', () => {
    const card = renderCard()
    expect(within(card).getByRole('button', { name: 'Resolve c-1' })).toBeDefined()
    expect(within(card).queryByRole('button', { name: 'Hide c-1' })).toBeNull()
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
  it('adds Nick’s reply to the outbox rather than sending it when Nick presses Add to outbox', async () => {
    const onReply = vi.fn<(text: string) => Promise<void>>(() => Promise.resolve())
    const onAddToOutbox = vi.fn<(text: string) => Promise<void>>(() => Promise.resolve())
    render(
      <ThreadCard
        id="c-1"
        kind="comment"
        messages={[question, answer]}
        state="waits-for-nick"
        outcome={undefined}
        textChanged={false}
        active={false}
        onActivate={() => undefined}
        onReply={onReply}
        onAddToOutbox={onAddToOutbox}
      />,
    )
    await userEvent.type(screen.getByRole('textbox', { name: 'Write a reply…' }), 'Why 8?')
    await userEvent.click(screen.getByRole('button', { name: 'Add to outbox' }))
    expect(onAddToOutbox).toHaveBeenCalledWith('Why 8?')
    expect(onReply).not.toHaveBeenCalled()
  })

  it('shows the replies in the outbox after the state of the thread', () => {
    render(
      <ThreadCard
        id="c-1"
        kind="comment"
        messages={[question]}
        state="waits-for-agent"
        outcome={undefined}
        textChanged={false}
        active={false}
        onActivate={() => undefined}
        outbox={<p>Why 8?</p>}
      />,
    )
    expect(screen.getByRole('region').textContent).toContain('Sent to the agentWhy 8?')
  })

  it('shows the quote, every message, the state and the reply box when Nick opens the thread at full size', async () => {
    renderCard({ quote })
    const view = await openFullSize()
    expect(view.getAttribute('aria-label')).toBe('Thread on “retries 5 times”')
    expect(within(view).getByRole('blockquote').textContent).toBe(
      'The job retries 5 times on a slow network.',
    )
    expect(within(view).getAllByRole('listitem')).toHaveLength(2)
    expect(view.textContent).toContain('The agent replied')
  })

  it('shows the reply box rather than the resolve button at full size', async () => {
    renderCard({ quote })
    const view = await openFullSize()
    expect(within(view).getByRole('textbox', { name: 'Write a reply…' })).toBeDefined()
    expect(within(view).queryByRole('button', { name: 'Resolve c-1' })).toBeNull()
  })

  it('gives the focus back to the full size button when Nick closes the full size view', async () => {
    renderCard({ quote })
    const control = screen.getByRole('button', { name: 'Open c-1 at full size' })
    await userEvent.click(control)
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(control)
  })

  it('keeps the reply that Nick has started when he opens the thread at full size', async () => {
    renderCard()
    await userEvent.type(screen.getByRole('textbox', { name: 'Write a reply…' }), 'Why 8?')
    const view = await openFullSize()
    expect(within(view).getByRole<HTMLTextAreaElement>('textbox').value).toBe('Why 8?')
  })

  it('shows every message of a resolved thread at full size', async () => {
    renderCard({ state: 'resolved', quote })
    const view = await openFullSize()
    expect(within(view).getAllByRole('listitem')).toHaveLength(2)
    expect(within(view).queryByRole('button', { name: /more message/ })).toBeNull()
  })

  it('cuts a long quote short in the label of the full size view', async () => {
    renderCard({ quote: { ...quote, selectedText: 'The export job retries 5 times. '.repeat(3) } })
    expect((await openFullSize()).getAttribute('aria-label')).toBe(
      'Thread on “The export job retries 5 times. The export job retries 5 tim…”',
    )
  })

  it('labels the full size view as a thread when the thread doesn’t have any selected text', async () => {
    renderCard({ quote: { prefix: '', selectedText: '', suffix: '' } })
    expect((await openFullSize()).getAttribute('aria-label')).toBe('Thread')
  })

  it('doesn’t quote anything at full size when the thread doesn’t have a quote', async () => {
    renderCard()
    const view = await openFullSize()
    expect(view.getAttribute('aria-label')).toBe('Thread')
    expect(within(view).queryByRole('blockquote')).toBeNull()
  })
})
