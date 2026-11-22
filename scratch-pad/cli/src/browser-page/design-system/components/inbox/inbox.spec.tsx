import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Inbox, type InboxEntry } from './inbox'

const decision: InboxEntry = {
  key: 'd-1',
  href: '/pad/#d-1',
  kind: 'decision',
  where: 'Invoice export',
  quote: 'Will the export job retry 8 times?',
  last: undefined,
  time: undefined,
  shownTime: undefined,
}

const reply: InboxEntry = {
  key: 'c-1',
  href: '/pad/invoice-template.md#c-1',
  kind: 'reply',
  where: 'Invoice template',
  quote: 'The tax number',
  last: 'Agent: I have moved the tax number.',
  time: '2026-11-20T21:12:00.000Z',
  shownTime: '20 Nov, 21:12',
}

function renderInbox(entries: readonly InboxEntry[], onNavigate = vi.fn<(href: string) => void>()) {
  render(
    <>
      <Inbox entries={entries} onNavigate={onNavigate} />
      <button type="button">Elsewhere</button>
    </>,
  )
  return { onNavigate, button: screen.getByRole('button', { name: /^Inbox/ }) }
}

describe('Inbox', () => {
  it('shows the count of the items that wait for Nick on the button when the list is closed', () => {
    const { button } = renderInbox([decision, reply])
    expect(button.textContent).toBe('Inbox2')
    expect(button.getAttribute('aria-label')).toBe('Inbox: 2 items wait for you')
    expect(button.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('opens the list of the items with the focus on the first item when Nick presses the button', async () => {
    const { button } = renderInbox([decision, reply])
    await userEvent.click(button)
    const items = screen.getAllByRole('menuitem')
    expect(items.map((item) => item.textContent)).toStrictEqual([
      'A decision to makeInvoice exportWill the export job retry 8 times?',
      'The agent replied20 Nov, 21:12Invoice templateThe tax numberAgent: I have moved the tax number.',
    ])
    expect(document.activeElement).toBe(items[0])
    expect(button.getAttribute('aria-expanded')).toBe('true')
  })

  it('points the button at the menu of the items', async () => {
    const { button } = renderInbox([decision])
    await userEvent.click(button)
    expect(button.getAttribute('aria-haspopup')).toBe('menu')
    expect(button.getAttribute('aria-controls')).toBe(screen.getByRole('menu').id)
  })

  it('goes to the item and closes the list when Nick chooses an item', async () => {
    const { button, onNavigate } = renderInbox([decision, reply])
    await userEvent.click(button)
    await userEvent.click(screen.getByRole('menuitem', { name: /The agent replied/ }))
    expect(onNavigate).toHaveBeenCalledWith('/pad/invoice-template.md#c-1')
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('moves between the items with the arrow keys and ignores another key', async () => {
    const { button } = renderInbox([decision, reply])
    await userEvent.click(button)
    await userEvent.keyboard('{ArrowUp}')
    expect(document.activeElement?.textContent).toContain('The agent replied')
    await userEvent.keyboard('{ArrowDown}x')
    expect(document.activeElement?.textContent).toContain('A decision to make')
  })

  it('keeps only the focused item in the Tab order and goes to the first or last item with Home and End', async () => {
    const { button } = renderInbox([decision, reply])
    await userEvent.click(button)
    expect(screen.getAllByRole('menuitem').map((item) => item.tabIndex)).toStrictEqual([0, -1])
    await userEvent.keyboard('{End}')
    expect(screen.getAllByRole('menuitem').map((item) => item.tabIndex)).toStrictEqual([-1, 0])
    await userEvent.keyboard('{Home}')
    expect(document.activeElement?.textContent).toContain('A decision to make')
  })

  it('closes the list and moves the focus on from the button when Nick presses Tab in the list', async () => {
    const { button } = renderInbox([decision, reply])
    await userEvent.click(button)
    await userEvent.tab()
    expect(screen.queryByRole('menu')).toBeNull()
    expect(document.activeElement?.textContent).toBe('Elsewhere')
  })

  it('closes the list and gives the focus back to the button when Nick presses Escape', async () => {
    const { button } = renderInbox([decision])
    await userEvent.click(button)
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).toBeNull()
    expect(document.activeElement).toBe(button)
  })

  it('closes the list when the focus leaves the Inbox', async () => {
    const { button } = renderInbox([decision])
    await userEvent.click(button)
    await userEvent.click(screen.getByRole('button', { name: 'Elsewhere' }))
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('says that nothing waits for Nick and doesn’t show a count when the Inbox is empty', async () => {
    const { button } = renderInbox([])
    await userEvent.click(button)
    expect(screen.getByText('Nothing waits for you.').tagName).toBe('P')
    expect(button.textContent).toBe('Inbox')
    expect(button.getAttribute('aria-haspopup')).toBeNull()
    expect(button.getAttribute('aria-controls')).toBe(
      screen.getByRole('group', { name: 'Inbox' }).id,
    )
  })

  it('closes the list when Nick presses the button again or Escape on the button', async () => {
    const { button } = renderInbox([])
    await userEvent.click(button)
    await userEvent.click(button)
    expect(button.getAttribute('aria-expanded')).toBe('false')
    await userEvent.click(button)
    await userEvent.keyboard('x{Escape}')
    expect(button.getAttribute('aria-expanded')).toBe('false')
  })

  it('uses the singular when one item waits for Nick', () => {
    const { button } = renderInbox([reply])
    expect(button.getAttribute('aria-label')).toBe('Inbox: 1 item waits for you')
  })
})
