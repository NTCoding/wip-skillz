import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { OutboxMessage } from './outbox-message'

class RefusedChangeError extends Error {}

function renderMessage(
  onEdit: (text: string) => Promise<void> = () => Promise.resolve(),
  onRemove: () => Promise<void> = () => Promise.resolve(),
  onEditingChange: (editing: boolean) => void = () => undefined,
) {
  return render(
    <OutboxMessage
      label="Comment"
      text="Is 5 retries enough?"
      time="2026-11-20T21:09:00.000Z"
      shownTime="20 Nov, 21:09"
      onEdit={onEdit}
      onRemove={onRemove}
      onEditingChange={onEditingChange}
    />,
  )
}

function messageGroup(): HTMLElement {
  return screen.getByRole('group', { name: 'Comment' })
}

describe('OutboxMessage', () => {
  it('shows the text, the time and the label In outbox', () => {
    renderMessage()
    const message = messageGroup()
    expect(message.textContent).toContain('Is 5 retries enough?')
    expect(message.textContent).toContain('20 Nov, 21:09')
    expect(message.textContent).toContain('In outbox')
  })

  it('saves the new text and shows the text again when Nick edits the message', async () => {
    const onEdit = vi.fn<(text: string) => Promise<void>>(() => Promise.resolve())
    renderMessage(onEdit)
    await userEvent.click(screen.getByRole('button', { name: 'Edit' }))
    const field = screen.getByRole('textbox', { name: 'Edit the comment' })
    expect(document.activeElement).toBe(field)
    await userEvent.clear(field)
    await userEvent.type(field, 'Is 8 retries enough?')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onEdit).toHaveBeenCalledWith('Is 8 retries enough?')
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(screen.getByRole('button', { name: 'Edit' })).toBeDefined()
  })

  it('keeps the text and leaves the edit when Nick presses Cancel', async () => {
    const onEdit = vi.fn<(text: string) => Promise<void>>(() => Promise.resolve())
    renderMessage(onEdit)
    await userEvent.click(screen.getByRole('button', { name: 'Edit' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onEdit).not.toHaveBeenCalled()
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('calls onRemove and disables the buttons while the server hasn’t returned yet', async () => {
    const removing = Promise.withResolvers<undefined>()
    const onRemove = vi.fn(() => removing.promise)
    renderMessage(undefined, onRemove)
    await userEvent.click(screen.getByRole('button', { name: 'Remove' }))
    expect(onRemove).toHaveBeenCalledOnce()
    expect(screen.getByRole('button', { name: 'Edit' })).toHaveProperty('disabled', true)
    removing.resolve(undefined)
  })

  it('shows the problem and enables the buttons again when the server refuses the removal', async () => {
    renderMessage(undefined, () => Promise.reject(new RefusedChangeError('The item was sent.')))
    await userEvent.click(screen.getByRole('button', { name: 'Remove' }))
    expect((await screen.findByRole('alert')).textContent).toBe('The item was sent.')
    expect(screen.getByRole('button', { name: 'Remove' })).toHaveProperty('disabled', false)
  })

  it('reports the start of an edit and its end when Nick edits the message and then cancels it', async () => {
    const onEditingChange = vi.fn<(editing: boolean) => void>()
    renderMessage(undefined, undefined, onEditingChange)
    await userEvent.click(screen.getByRole('button', { name: 'Edit' }))
    expect(onEditingChange.mock.calls).toStrictEqual([[true]])
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onEditingChange.mock.calls).toStrictEqual([[true], [false]])
  })

  it('reports the end of the edit when the message is removed from the page during an edit', async () => {
    const onEditingChange = vi.fn<(editing: boolean) => void>()
    const { unmount } = renderMessage(undefined, undefined, onEditingChange)
    await userEvent.click(screen.getByRole('button', { name: 'Edit' }))
    unmount()
    expect(onEditingChange.mock.calls).toStrictEqual([[true], [false]])
  })
})
