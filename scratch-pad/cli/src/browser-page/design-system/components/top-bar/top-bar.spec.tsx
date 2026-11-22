import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { type FullTreeNode } from '../full-tree/full-tree'
import { MarginLane } from '../margin-lane/margin-lane'
import { TopBar } from './top-bar'

class UnreachableServerError extends Error {}

function node(kind: FullTreeNode['kind'], title: string, children: readonly FullTreeNode[] = []) {
  return { kind, title, href: `/pad/${title}`, children }
}

const retryLimit = node('page', '1 Retry limit', [
  node('section', 'Why 5 retries'),
  node('page', '1.1 Wait between retries', [node('section', 'Why the wait doubles')]),
])

function renderWithSubtree(onNavigate: (href: string) => void = () => undefined) {
  render(
    <TopBar
      title="Invoice export"
      titleHref="/pad/"
      parents={[{ title: 'Retry limit', href: '/pad/retry-limit.md' }]}
      current="Wait between retries"
      onNavigate={onNavigate}
      actions={<button type="button">Inbox</button>}
      subtree={{ root: retryLimit, currentHref: '/pad/1.1 Wait between retries' }}
    />,
  )
}

function currentCrumb(): HTMLElement {
  return screen.getByRole('button', { name: 'Wait between retries' })
}

function subtreeList(): HTMLElement | null {
  return screen.queryByRole('list', { name: 'Where you are' })
}

function renderTopBar(onNavigate: (href: string) => void = () => undefined) {
  render(
    <TopBar
      title="Invoice export"
      titleHref="/pad/"
      parents={[]}
      current="Retry limit"
      onNavigate={onNavigate}
      actions={<span>Actions</span>}
    />,
  )
}

describe('TopBar', () => {
  it('shows the name of the scratch pad, the current view and the actions when it is rendered', () => {
    renderTopBar()
    const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(breadcrumb.textContent).toBe('Invoice export/Retry limit')
    expect(screen.getByText('Retry limit').getAttribute('aria-current')).toBe('page')
    expect(screen.getAllByRole('link')).toHaveLength(1)
    expect(screen.getByText('Actions').textContent).toBe('Actions')
  })

  it('shows only the name of the scratch pad as the current crumb when there isn’t a current view', () => {
    render(
      <TopBar
        title="Invoice export"
        titleHref="/pad/"
        parents={[]}
        current={undefined}
        onNavigate={() => undefined}
        actions={undefined}
      />,
    )
    const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(breadcrumb.textContent).toBe('Invoice export')
    expect(screen.getByText('Invoice export').getAttribute('aria-current')).toBe('page')
    expect(screen.queryAllByRole('link')).toHaveLength(0)
  })

  it('shows every parent of the current page as a link between the scratch pad and the page', async () => {
    const onNavigate = vi.fn<(href: string) => void>()
    render(
      <TopBar
        title="Invoice export"
        titleHref="/pad/"
        parents={[
          { title: 'Retry limit', href: '/pad/retry-limit.md' },
          { title: 'Wait between retries', href: '/pad/wait-between-retries.md' },
        ]}
        current="First retry"
        onNavigate={onNavigate}
        actions={undefined}
      />,
    )
    const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(breadcrumb.textContent).toBe(
      'Invoice export/Retry limit/Wait between retries/First retry',
    )
    expect(
      within(breadcrumb)
        .getAllByRole('link')
        .map((link) => link.getAttribute('href')),
    ).toStrictEqual(['/pad/', '/pad/retry-limit.md', '/pad/wait-between-retries.md'])
    expect(screen.getByText('First retry').getAttribute('aria-current')).toBe('page')
    await userEvent.click(screen.getByRole('link', { name: 'Wait between retries' }))
    expect(onNavigate).toHaveBeenCalledWith('/pad/wait-between-retries.md')
  })

  it('navigates to the first page when Nick clicks the name of the scratch pad', async () => {
    const onNavigate = vi.fn<(href: string) => void>()
    renderTopBar(onNavigate)
    await userEvent.click(screen.getByRole('link', { name: 'Invoice export' }))
    expect(onNavigate).toHaveBeenCalledWith('/pad/')
  })

  it('shows the subtree of the current page when Nick hovers on its name', async () => {
    renderWithSubtree()
    expect(subtreeList()).toBeNull()
    await userEvent.hover(currentCrumb())
    expect(subtreeList()?.textContent).toBe(
      '1 Retry limitWhy 5 retries1.1 Wait between retriesYou are hereWhy the wait doubles',
    )
    expect(currentCrumb().getAttribute('aria-expanded')).toBe('true')
    expect(
      document.getElementById(currentCrumb().getAttribute('aria-controls') ?? 'none'),
    ).not.toBeNull()
  })

  it('keeps the subtree while the pointer is on it and hides it when the pointer leaves', async () => {
    renderWithSubtree()
    await userEvent.hover(currentCrumb())
    await userEvent.hover(screen.getByText('Where you are'))
    expect(subtreeList()).not.toBeNull()
    await userEvent.unhover(screen.getByText('Where you are'))
    expect(subtreeList()).toBeNull()
    expect(currentCrumb().getAttribute('aria-expanded')).toBe('false')
  })

  it('shows the subtree while the name of the current page has the focus', async () => {
    renderWithSubtree()
    await userEvent.tab()
    await userEvent.tab()
    await userEvent.tab()
    expect(document.activeElement).toBe(currentCrumb())
    expect(subtreeList()).not.toBeNull()
    await userEvent.tab()
    expect(subtreeList()).toBeNull()
  })

  it('hides the subtree when Nick presses Escape and ignores the other keys', async () => {
    renderWithSubtree()
    act(() => currentCrumb().focus())
    fireEvent.keyDown(document, { key: 'Enter' })
    expect(subtreeList()).not.toBeNull()
    await userEvent.keyboard('{Escape}')
    expect(subtreeList()).toBeNull()
  })

  it('only hides the subtree, rather than the open card in the margin too, when Nick presses Escape', async () => {
    const onClosePopup = vi.fn<() => void>()
    render(
      <MarginLane
        label="Comments and notes"
        items={[
          {
            key: 'c-1',
            anchorLines: '3-3',
            content: <p>Is 5 retries enough?</p>,
            marker: undefined,
            popup: true,
          },
        ]}
        onClosePopup={onClosePopup}
      />,
    )
    renderWithSubtree()
    act(() => currentCrumb().focus())
    await userEvent.keyboard('{Escape}')
    expect(subtreeList()).toBeNull()
    expect(onClosePopup).not.toHaveBeenCalled()
    await userEvent.keyboard('{Escape}')
    expect(onClosePopup).toHaveBeenCalledTimes(1)
  })

  it('only shows the subtree when Nick clicks the name of the current page', async () => {
    const onNavigate = vi.fn<(href: string) => void>()
    renderWithSubtree(onNavigate)
    act(() => currentCrumb().focus())
    await userEvent.keyboard('{Escape}')
    await userEvent.click(currentCrumb())
    expect(subtreeList()).not.toBeNull()
    expect(onNavigate).not.toHaveBeenCalled()
  })

  it('calls the page action when Nick clicks its button after the current page and keeps the subtree', async () => {
    const onClick = vi.fn(() => Promise.resolve())
    render(
      <TopBar
        title="Invoice export"
        titleHref="/pad/"
        parents={[]}
        current="Retry limit"
        onNavigate={() => undefined}
        actions={undefined}
        subtree={{ root: retryLimit, currentHref: '/pad/1 Retry limit' }}
        pageAction={{ label: 'Mark as unread', onClick }}
      />,
    )
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' }).textContent).toBe(
      'Invoice export/Retry limitMark as unread',
    )
    await userEvent.hover(screen.getByRole('button', { name: 'Retry limit' }))
    expect(subtreeList()).not.toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Mark as unread' }))
    expect(onClick).toHaveBeenCalledOnce()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('shows the problem after the button when the server doesn’t accept the page action', async () => {
    render(
      <TopBar
        title="Invoice export"
        titleHref="/pad/"
        parents={[]}
        current="Retry limit"
        onNavigate={() => undefined}
        actions={undefined}
        pageAction={{
          label: 'Mark as read',
          onClick: () => Promise.reject(new UnreachableServerError('The server didn’t respond.')),
        }}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Mark as read' }))
    expect((await screen.findByRole('alert')).textContent).toBe('The server didn’t respond.')
    expect(screen.getByRole('button', { name: 'Mark as read' })).toHaveProperty('disabled', false)
  })
})
