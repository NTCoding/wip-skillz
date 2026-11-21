import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Sidebar } from './sidebar'

interface SidebarCallbacks {
  readonly onCollapsedChange?: (collapsed: boolean) => void
  readonly onNavigate?: (href: string) => void
}

function renderSidebar(collapsed: boolean, callbacks: SidebarCallbacks = {}) {
  render(
    <Sidebar
      label="Pages of the scratch pad"
      title="invoice export"
      titleHref="/pad/"
      onNavigate={callbacks.onNavigate ?? (() => undefined)}
      views={<li>Progress tracker</li>}
      heading="Pages"
      collapsed={collapsed}
      onCollapsedChange={callbacks.onCollapsedChange ?? (() => undefined)}
    >
      <li>Invoice template</li>
    </Sidebar>,
  )
}

describe('Sidebar', () => {
  it('shows the scratch pad, the views, the pages and a button that collapses the sidebar when the sidebar is open', () => {
    renderSidebar(false)
    const sidebar = screen.getByRole('navigation', { name: 'Pages of the scratch pad' })
    expect(within(sidebar).getByRole('link').textContent).toBe('Iinvoice export')
    expect(
      within(sidebar)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toStrictEqual(['Progress tracker', 'Invoice template'])
    expect(screen.getByRole('button', { name: 'Collapse the sidebar' }).textContent).toBe('')
  })

  it('navigates to the first page when Nick clicks the name of the scratch pad', async () => {
    const onNavigate = vi.fn<(href: string) => void>()
    renderSidebar(false, { onNavigate })
    await userEvent.click(screen.getByRole('link', { name: 'invoice export' }))
    expect(onNavigate).toHaveBeenCalledWith('/pad/')
  })

  it('asks to collapse the sidebar when Nick presses the button at the bottom', async () => {
    const onCollapsedChange = vi.fn<(collapsed: boolean) => void>()
    renderSidebar(false, { onCollapsedChange })
    await userEvent.click(screen.getByRole('button', { name: 'Collapse the sidebar' }))
    expect(onCollapsedChange).toHaveBeenCalledWith(true)
  })

  it('hides the scratch pad and the pages and asks to expand the sidebar when the sidebar is collapsed', async () => {
    const onCollapsedChange = vi.fn<(collapsed: boolean) => void>()
    renderSidebar(true, { onCollapsedChange })
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.queryByRole('listitem')).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Expand the sidebar' }))
    expect(onCollapsedChange).toHaveBeenCalledWith(false)
  })
})
