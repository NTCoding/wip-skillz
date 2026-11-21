import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TopBar } from './top-bar'

describe('TopBar', () => {
  it('shows the name of the scratch pad, the tabs and the actions when it is rendered', () => {
    render(
      <TopBar
        title="invoice export"
        titleHref="/pad/"
        onNavigate={() => undefined}
        tabs={<span>Tabs</span>}
        actions={<span>Actions</span>}
      />,
    )
    expect(screen.getByRole('link').textContent).toBe('Iinvoice export')
    expect(screen.getByText('Tabs').textContent).toBe('Tabs')
    expect(screen.getByText('Actions').textContent).toBe('Actions')
  })

  it('navigates to the first page when Nick clicks the name of the scratch pad', async () => {
    const onNavigate = vi.fn<(href: string) => void>()
    render(
      <TopBar
        title="Invoice export"
        titleHref="/pad/"
        onNavigate={onNavigate}
        tabs={null}
        actions={null}
      />,
    )
    await userEvent.click(screen.getByRole('link'))
    expect(onNavigate).toHaveBeenCalledWith('/pad/')
  })
})
