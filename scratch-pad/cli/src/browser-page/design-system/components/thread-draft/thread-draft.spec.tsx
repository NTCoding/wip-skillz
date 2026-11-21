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
})
