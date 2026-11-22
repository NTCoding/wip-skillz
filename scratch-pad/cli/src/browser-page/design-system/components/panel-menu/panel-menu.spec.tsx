import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PanelMenu, type PanelMenuItem } from './panel-menu'

const reply: PanelMenuItem = {
  key: 'c-1',
  href: '/pad/retry-limit.md#c-1',
  kind: 'reply',
  heading: 'The agent replied',
  where: 'Retry limit',
  quote: 'The export job retries 5 times.',
  last: 'Agent: I have raised the limit to 8 retries.',
  time: '2026-11-20T21:12:00.000Z',
  shownTime: '20 Nov, 21:12',
  linkLabel: undefined,
}

const queued: PanelMenuItem = {
  key: 'outbox-1',
  href: '/pad/invoice-template.md#outbox-1',
  kind: 'queued',
  heading: 'Comment',
  where: 'Invoice template',
  quote: 'the tax number',
  last: 'Is the tax number on every invoice?',
  time: '2026-11-20T21:14:00.000Z',
  shownTime: 'Queued 20 Nov, 21:14',
  linkLabel: 'Show on the page',
}

const section: PanelMenuItem = {
  key: 'section pages/invoice-template.md the-logo',
  href: '/pad/invoice-template.md#the-logo',
  kind: 'section',
  heading: 'A section changed',
  where: 'Invoice template › The logo',
  quote: undefined,
  last: undefined,
  time: undefined,
  shownTime: undefined,
  linkLabel: undefined,
}

interface MenuOptions {
  readonly onTab?: () => void
  readonly onChoose?: () => void
  readonly onNavigate?: (href: string) => void
}

function renderMenu(items: readonly PanelMenuItem[], options: MenuOptions = {}) {
  const props = {
    id: 'exports-menu',
    labelledBy: 'exports-title',
    onNavigate: options.onNavigate ?? (() => undefined),
    onChoose: options.onChoose ?? (() => undefined),
    onTab: options.onTab,
  }
  const view = render(
    <>
      <p id="exports-title">Waiting for you</p>
      <PanelMenu items={items} {...props} />
      <button type="button">Elsewhere</button>
    </>,
  )
  return {
    rerender: (changed: readonly PanelMenuItem[]) =>
      view.rerender(
        <>
          <p id="exports-title">Waiting for you</p>
          <PanelMenu items={changed} {...props} />
          <button type="button">Elsewhere</button>
        </>,
      ),
  }
}

function tabIndexes(): number[] {
  return screen.getAllByRole('menuitem').map((item) => item.tabIndex)
}

describe('PanelMenu', () => {
  it('shows each item with its heading, its time, its place, its quote, its last line and its link', () => {
    renderMenu([reply, queued, section])
    expect(screen.getByRole('menu', { name: 'Waiting for you' }).id).toBe('exports-menu')
    expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toStrictEqual([
      'The agent replied20 Nov, 21:12Retry limitThe export job retries 5 times.Agent: I have raised the limit to 8 retries.',
      'CommentQueued 20 Nov, 21:14Invoice templatethe tax numberIs the tax number on every invoice?Show on the page',
      'A section changedInvoice template › The logo',
    ])
  })

  it('focuses the first item when the menu is shown', () => {
    renderMenu([reply, queued])
    expect(document.activeElement?.textContent).toContain('The agent replied')
    expect(tabIndexes()).toStrictEqual([0, -1])
  })

  it('moves the focus with the arrow keys from the last item to the first and back', async () => {
    renderMenu([reply, queued])
    await userEvent.keyboard('{ArrowDown}')
    expect(tabIndexes()).toStrictEqual([-1, 0])
    await userEvent.keyboard('{ArrowDown}')
    expect(document.activeElement?.textContent).toContain('The agent replied')
    await userEvent.keyboard('{ArrowUp}')
    expect(document.activeElement?.textContent).toContain('Comment')
    await userEvent.keyboard('{ArrowUp}')
    expect(document.activeElement?.textContent).toContain('The agent replied')
  })

  it('moves the focus to the last item with End and to the first item with Home and ignores another key', async () => {
    renderMenu([reply, queued, section])
    await userEvent.keyboard('{End}')
    expect(document.activeElement?.textContent).toContain('A section changed')
    await userEvent.keyboard('{Home}x')
    expect(document.activeElement?.textContent).toContain('The agent replied')
  })

  it('calls onTab when Nick presses Tab', async () => {
    const onTab = vi.fn<() => void>()
    renderMenu([reply], { onTab })
    await userEvent.tab()
    expect(onTab).toHaveBeenCalledOnce()
  })

  it('moves the focus to the next control when Nick presses Tab and there isn’t an onTab', async () => {
    renderMenu([reply])
    await userEvent.tab()
    expect(document.activeElement?.textContent).toBe('Elsewhere')
  })

  it('keeps the last item in the Tab order when the current item is removed', async () => {
    const { rerender } = renderMenu([reply, queued])
    await userEvent.keyboard('{End}')
    rerender([reply])
    expect(tabIndexes()).toStrictEqual([0])
  })

  it('calls onChoose and goes to the item when Nick clicks an item', async () => {
    const onChoose = vi.fn<() => void>()
    const onNavigate = vi.fn<(href: string) => void>()
    renderMenu([reply, queued], { onChoose, onNavigate })
    await userEvent.click(screen.getByRole('menuitem', { name: /Show on the page/ }))
    expect(onChoose).toHaveBeenCalledOnce()
    expect(onNavigate).toHaveBeenCalledWith('/pad/invoice-template.md#outbox-1')
  })
})
