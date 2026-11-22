import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MessageBox, problemOf } from './message-box'

class RefusedMessageError extends Error {}

function renderBox(onSubmit: (text: string) => Promise<void>, onCancel?: () => void) {
  render(
    onCancel === undefined ? (
      <MessageBox label="Write a reply…" submitLabel="Reply" onSubmit={onSubmit} />
    ) : (
      <MessageBox
        label="Write a reply…"
        submitLabel="Reply"
        onSubmit={onSubmit}
        onCancel={onCancel}
        focusOnMount
      />
    ),
  )
  return screen.getByRole('textbox', { name: 'Write a reply…' })
}

describe('MessageBox', () => {
  it('sends the trimmed text and empties the field when Nick presses the button', async () => {
    const onSubmit = vi.fn(() => Promise.resolve())
    const field = renderBox(onSubmit)
    await userEvent.type(field, '  Is 5 retries enough?  ')
    await userEvent.click(screen.getByRole('button', { name: 'Reply' }))
    expect(onSubmit).toHaveBeenCalledWith('Is 5 retries enough?')
    expect(field).toHaveProperty('value', '')
  })

  it('sends the text when Nick presses Enter and adds a line when he presses Shift and Enter', async () => {
    const onSubmit = vi.fn(() => Promise.resolve())
    const field = renderBox(onSubmit)
    await userEvent.type(field, 'First line{Shift>}{Enter}{/Shift}second line{Enter}')
    expect(onSubmit).toHaveBeenCalledWith('First line\nsecond line')
  })

  it('doesn’t send anything and doesn’t show the button when the field is empty', async () => {
    const onSubmit = vi.fn(() => Promise.resolve())
    const field = renderBox(onSubmit)
    await userEvent.type(field, '   {Enter}')
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Reply' })).toBeNull()
  })

  it('disables the button of a box that can be cancelled while the field is empty', () => {
    renderBox(
      () => Promise.resolve(),
      () => undefined,
    )
    expect(screen.getByRole('button', { name: 'Reply' })).toHaveProperty('disabled', true)
  })

  it('sends a message only once while the server hasn’t returned yet', async () => {
    const sending = Promise.withResolvers<undefined>()
    const onSubmit = vi.fn(() => sending.promise)
    const field = renderBox(onSubmit)
    await userEvent.type(field, 'Thanks{Enter}{Enter}')
    sending.resolve(undefined)
    expect(onSubmit).toHaveBeenCalledOnce()
  })

  it('keeps the text and shows the problem when the server refuses the message', async () => {
    const field = renderBox(() => Promise.reject(new RefusedMessageError('The thread is closed.')))
    await userEvent.type(field, 'Thanks{Enter}')
    expect((await screen.findByRole('alert')).textContent).toBe('The thread is closed.')
    expect(field).toHaveProperty('value', 'Thanks')
  })

  it('has the focus and calls onCancel when Nick presses Escape in a box that can be cancelled', async () => {
    const onCancel = vi.fn<() => void>()
    const field = renderBox(() => Promise.resolve(), onCancel)
    expect(document.activeElement).toBe(field)
    await userEvent.keyboard('{Escape}')
    expect(onCancel).toHaveBeenCalledWith()
  })

  it('ignores Escape when the box can’t be cancelled', async () => {
    const field = renderBox(() => Promise.resolve())
    await userEvent.type(field, 'Thanks{Escape}')
    expect(field).toHaveProperty('value', 'Thanks')
  })

  it('sends the text with the second submit rather than the main one when Nick presses the second button', async () => {
    const onSubmit = vi.fn(() => Promise.resolve())
    const onQueue = vi.fn(() => Promise.resolve())
    render(
      <MessageBox
        label="Write a comment…"
        submitLabel="Send"
        onSubmit={onSubmit}
        secondSubmit={{ label: 'Add to outbox', onSubmit: onQueue }}
      />,
    )
    const field = screen.getByRole('textbox', { name: 'Write a comment…' })
    await userEvent.type(field, ' Is 5 retries enough? ')
    await userEvent.click(screen.getByRole('button', { name: 'Add to outbox' }))
    expect(onQueue).toHaveBeenCalledWith('Is 5 retries enough?')
    expect(onSubmit).not.toHaveBeenCalled()
    expect(field).toHaveProperty('value', '')
  })

  it('shows the second button disabled while the field of a box that can be cancelled is empty', () => {
    render(
      <MessageBox
        label="Write a comment…"
        submitLabel="Send"
        onSubmit={() => Promise.resolve()}
        secondSubmit={{ label: 'Add to outbox', onSubmit: () => Promise.resolve() }}
        onCancel={() => undefined}
      />,
    )
    expect(screen.getByRole('button', { name: 'Add to outbox' })).toHaveProperty('disabled', true)
  })

  it('starts with the initial text in the field and the cursor after it when it is given', () => {
    render(
      <MessageBox
        label="Edit the comment"
        submitLabel="Save"
        onSubmit={() => Promise.resolve()}
        initialText="Is 5 retries enough?"
        focusOnMount
      />,
    )
    const field = screen.getByRole('textbox', { name: 'Edit the comment' })
    expect(field).toHaveProperty('value', 'Is 5 retries enough?')
    expect(field).toHaveProperty('selectionStart', 20)
  })

  it('describes a refusal without a message in its own words when the error isn’t an Error', () => {
    expect(problemOf('offline')).toBe('The server didn’t accept the message.')
  })
})
