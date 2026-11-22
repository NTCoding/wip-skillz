import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Outbox } from './outbox'

class RefusedSendError extends Error {}

function renderOutbox(
  count: number,
  onSendAll: () => Promise<void> = () => Promise.resolve(),
  editing = false,
) {
  render(
    <>
      <Outbox count={count} editing={editing} onSendAll={onSendAll} />
      <button type="button">Elsewhere</button>
    </>,
  )
  return screen.getByRole('button', { name: /^Outbox/ })
}

describe('Outbox', () => {
  it('shows the count of the queued items on the button', () => {
    const button = renderOutbox(3)
    expect(button.textContent).toBe('Outbox3')
    expect(button.getAttribute('aria-label')).toBe('Outbox: 3 items are in the outbox.')
  })

  it('doesn’t show a count when the outbox is empty', () => {
    expect(renderOutbox(0).textContent).toBe('Outbox')
  })

  it('opens the panel with the count and an enabled Send all button when Nick clicks the button', async () => {
    await userEvent.click(renderOutbox(1))
    const panel = screen.getByRole('group', { name: 'Outbox' })
    expect(panel.textContent).toContain('1 item is in the outbox.')
    expect(screen.getByRole('button', { name: 'Send all' })).toHaveProperty('disabled', false)
  })

  it('disables Send all when the outbox is empty', async () => {
    await userEvent.click(renderOutbox(0))
    expect(screen.getByRole('group', { name: 'Outbox' }).textContent).toContain(
      'The outbox is empty.',
    )
    expect(screen.getByRole('button', { name: 'Send all' })).toHaveProperty('disabled', true)
  })

  it('disables Send all and explains why when Nick edits an item in the outbox', async () => {
    await userEvent.click(renderOutbox(2, undefined, true))
    expect(screen.getByRole('group', { name: 'Outbox' }).textContent).toContain(
      'Save or cancel your edit to send the outbox.',
    )
    expect(screen.getByRole('button', { name: 'Send all' })).toHaveProperty('disabled', true)
  })

  it('doesn’t explain anything below Send all when Nick isn’t editing an item', async () => {
    await userEvent.click(renderOutbox(2))
    expect(screen.getByRole('group', { name: 'Outbox' }).textContent).not.toContain(
      'Save or cancel',
    )
  })

  it('sends every item, closes the panel and focuses the Outbox button when Nick clicks Send all', async () => {
    const onSendAll = vi.fn(() => Promise.resolve())
    const button = renderOutbox(2, onSendAll)
    await userEvent.click(button)
    await userEvent.click(screen.getByRole('button', { name: 'Send all' }))
    expect(onSendAll).toHaveBeenCalledOnce()
    expect(screen.queryByRole('group', { name: 'Outbox' })).toBeNull()
    expect(document.activeElement).toBe(button)
  })

  it('keeps the panel open and shows the problem when the server refuses to send', async () => {
    await userEvent.click(
      renderOutbox(2, () => Promise.reject(new RefusedSendError('The server has stopped.'))),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Send all' }))
    expect((await screen.findByRole('alert')).textContent).toBe('The server has stopped.')
    expect(screen.getByRole('button', { name: 'Send all' })).toHaveProperty('disabled', false)
  })

  it('closes the panel and focuses the button when Nick presses Escape', async () => {
    const button = renderOutbox(2)
    await userEvent.click(button)
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('group', { name: 'Outbox' })).toBeNull()
    expect(document.activeElement).toBe(button)
  })

  it('keeps the panel open when Nick presses another key', async () => {
    await userEvent.click(renderOutbox(2))
    await userEvent.keyboard('{ArrowDown}')
    expect(screen.getByRole('group', { name: 'Outbox' })).toBeDefined()
  })

  it('ignores Escape when the panel is closed', async () => {
    const button = renderOutbox(2)
    button.focus()
    await userEvent.keyboard('{Escape}')
    expect(button.getAttribute('aria-expanded')).toBe('false')
  })

  it('closes the panel when the focus leaves the outbox', async () => {
    await userEvent.click(renderOutbox(2))
    await userEvent.click(screen.getByRole('button', { name: 'Elsewhere' }))
    expect(screen.queryByRole('group', { name: 'Outbox' })).toBeNull()
  })

  it('keeps the panel open when the focus moves inside the outbox', async () => {
    await userEvent.click(renderOutbox(2))
    screen.getByRole('button', { name: 'Send all' }).focus()
    expect(screen.getByRole('group', { name: 'Outbox' })).toBeDefined()
  })

  it('closes the panel when Nick clicks the button again', async () => {
    const button = renderOutbox(2)
    await userEvent.click(button)
    await userEvent.click(button)
    expect(screen.queryByRole('group', { name: 'Outbox' })).toBeNull()
  })
})
