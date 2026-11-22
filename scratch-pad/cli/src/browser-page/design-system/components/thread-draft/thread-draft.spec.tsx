import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ThreadDraft } from './thread-draft'

describe('ThreadDraft', () => {
  it('quotes the selected text and sends the note when Nick writes it', async () => {
    const onSend = vi.fn<(text: string) => Promise<void>>(() => Promise.resolve())
    render(
      <ThreadDraft
        kind="improvement"
        selectedText="retries 5 times"
        onSend={onSend}
        onCancel={() => undefined}
      />,
    )
    expect(screen.getByRole('region', { name: 'New improvement' }).textContent).toContain(
      'retries 5 times',
    )
    await userEvent.keyboard('Add an example.{Enter}')
    expect(onSend).toHaveBeenCalledWith('Add an example.')
  })

  it('calls onCancel when Nick presses Cancel', async () => {
    const onCancel = vi.fn<() => void>()
    render(
      <ThreadDraft
        kind="comment"
        selectedText="5"
        onSend={() => Promise.resolve()}
        onCancel={onCancel}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledWith()
  })

  it('keeps the draft and only closes the full size view when Nick presses Escape in the draft at full size', async () => {
    const onCancel = vi.fn<() => void>()
    render(
      <ThreadDraft
        kind="comment"
        selectedText="retries 5 times"
        onSend={() => Promise.resolve()}
        onCancel={onCancel}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Open the new comment at full size' }))
    const field = screen.getByRole('textbox', { name: 'Write a comment…' })
    await userEvent.type(field, 'Is 5 enough?')
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(onCancel).not.toHaveBeenCalled()
    expect(screen.getByRole('textbox', { name: 'Write a comment…' })).toHaveProperty(
      'value',
      'Is 5 enough?',
    )
  })

  it('doesn’t show a quote when Nick comments on a whole block', () => {
    render(
      <ThreadDraft
        kind="comment"
        selectedText=""
        onSend={() => Promise.resolve()}
        onCancel={() => undefined}
      />,
    )
    expect(
      screen.getByRole('region', { name: 'New comment' }).querySelector('blockquote'),
    ).toBeNull()
  })
  it('adds the comment to the outbox rather than sending it when Nick presses Add to outbox', async () => {
    const onSend = vi.fn<(text: string) => Promise<void>>(() => Promise.resolve())
    const onAddToOutbox = vi.fn<(text: string) => Promise<void>>(() => Promise.resolve())
    render(
      <ThreadDraft
        kind="comment"
        selectedText="retries 5 times"
        onSend={onSend}
        onAddToOutbox={onAddToOutbox}
        onCancel={() => undefined}
      />,
    )
    await userEvent.keyboard('Is 5 enough?')
    await userEvent.click(screen.getByRole('button', { name: 'Add to outbox' }))
    expect(onAddToOutbox).toHaveBeenCalledWith('Is 5 enough?')
    expect(onSend).not.toHaveBeenCalled()
  })

  it('doesn’t show Add to outbox when the draft can’t be added to the outbox', () => {
    render(
      <ThreadDraft
        kind="grammar"
        selectedText="5"
        onSend={() => Promise.resolve()}
        onCancel={() => undefined}
      />,
    )
    expect(screen.queryByRole('button', { name: 'Add to outbox' })).toBeNull()
  })
})
