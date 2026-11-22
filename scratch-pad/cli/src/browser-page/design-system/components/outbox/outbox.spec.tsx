import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Outbox, type OutboxEntry } from './outbox'

class RefusedSendError extends Error {}

const comment: OutboxEntry = {
  key: 'outbox-1',
  href: '/pad/invoice-template.md#outbox-1',
  kind: 'comment',
  where: 'Invoice template › The tax number',
  quote: 'the tax number of the shop',
  text: 'Is the tax number on every invoice?',
  time: '2026-11-20T21:14:00.000Z',
  shownTime: 'Queued 20 Nov, 21:14',
}

const reply: OutboxEntry = {
  key: 'outbox-2',
  href: '/pad/retry-limit.md#c-1',
  kind: 'reply',
  where: 'Retry limit',
  quote: 'The export job retries 5 times.',
  text: 'Can a shop ask for 10?',
  time: '2026-11-20T21:15:00.000Z',
  shownTime: 'Queued 20 Nov, 21:15',
}

interface OutboxOptions {
  readonly entries?: readonly OutboxEntry[]
  readonly onSendAll?: () => Promise<void>
  readonly editing?: boolean
  readonly onNavigate?: (href: string) => void
}

function renderOutbox(count: number, options: OutboxOptions = {}) {
  render(
    <>
      <Outbox
        count={count}
        entries={options.entries ?? []}
        editing={options.editing ?? false}
        onSendAll={options.onSendAll ?? (() => Promise.resolve())}
        onNavigate={options.onNavigate ?? (() => undefined)}
      />
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
    await userEvent.click(renderOutbox(2, { editing: true }))
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
    const button = renderOutbox(2, { onSendAll })
    await userEvent.click(button)
    await userEvent.click(screen.getByRole('button', { name: 'Send all' }))
    expect(onSendAll).toHaveBeenCalledOnce()
    expect(screen.queryByRole('group', { name: 'Outbox' })).toBeNull()
    expect(document.activeElement).toBe(button)
  })

  it('keeps the panel open and shows the problem when the server refuses to send', async () => {
    await userEvent.click(
      renderOutbox(2, {
        onSendAll: () => Promise.reject(new RefusedSendError('The server has stopped.')),
      }),
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

  it('lists each item with its kind, its time, its place, its quote and Nick’s text', async () => {
    await userEvent.click(renderOutbox(2, { entries: [comment, reply] }))
    expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toStrictEqual([
      'CommentQueued 20 Nov, 21:14Invoice template › The tax numberthe tax number of the shopIs the tax number on every invoice?Show on the page',
      'ReplyQueued 20 Nov, 21:15Retry limitThe export job retries 5 times.Can a shop ask for 10?Show on the page',
    ])
    expect(screen.getByRole('menu').getAttribute('aria-labelledby')).toBe(
      screen.getByText('2 items are in the outbox.').id,
    )
  })

  it('focuses the first item when the panel opens and moves between the items with the arrow keys', async () => {
    await userEvent.click(renderOutbox(2, { entries: [comment, reply] }))
    expect(document.activeElement?.textContent).toContain('Is the tax number on every invoice?')
    await userEvent.keyboard('{ArrowDown}')
    expect(document.activeElement?.textContent).toContain('Can a shop ask for 10?')
  })

  it('moves the focus from the items to Send all when Nick presses Tab and keeps the panel open', async () => {
    await userEvent.click(renderOutbox(2, { entries: [comment, reply] }))
    await userEvent.tab()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Send all' }))
    expect(screen.getByRole('group', { name: 'Outbox' })).toBeDefined()
  })

  it('goes to the card of the item and closes the panel when Nick clicks Show on the page', async () => {
    const onNavigate = vi.fn<(href: string) => void>()
    await userEvent.click(renderOutbox(2, { entries: [comment, reply], onNavigate }))
    await userEvent.click(screen.getByRole('menuitem', { name: /Can a shop ask for 10\?/ }))
    expect(onNavigate).toHaveBeenCalledWith('/pad/retry-limit.md#c-1')
    expect(screen.queryByRole('group', { name: 'Outbox' })).toBeNull()
  })

  it('doesn’t show a list when the outbox is empty', async () => {
    await userEvent.click(renderOutbox(0))
    expect(screen.queryByRole('menu')).toBeNull()
  })
})
