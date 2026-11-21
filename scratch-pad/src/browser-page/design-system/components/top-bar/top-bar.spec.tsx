import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TopBar } from './top-bar'

function renderTopBar(onNavigate: (href: string) => void = () => undefined) {
  render(
    <TopBar
      title="Invoice export"
      titleHref="/pad/"
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

  it('navigates to the first page when Nick clicks the name of the scratch pad', async () => {
    const onNavigate = vi.fn<(href: string) => void>()
    renderTopBar(onNavigate)
    await userEvent.click(screen.getByRole('link', { name: 'Invoice export' }))
    expect(onNavigate).toHaveBeenCalledWith('/pad/')
  })
})
