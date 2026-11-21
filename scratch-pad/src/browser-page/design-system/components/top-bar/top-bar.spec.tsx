import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TopBar } from './top-bar'

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
})
