import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Sidebar } from './sidebar'

function renderSidebar(collapsed: boolean, onCollapsedChange: (collapsed: boolean) => void) {
  render(
    <Sidebar
      label="Pages of the scratch pad"
      heading="Pages"
      collapsed={collapsed}
      onCollapsedChange={onCollapsedChange}
    >
      <li>Invoice export</li>
    </Sidebar>,
  )
}

describe('Sidebar', () => {
  it('shows the pages and a button that collapses the sidebar when the sidebar is open', () => {
    renderSidebar(false, () => undefined)
    expect(
      screen.getByRole('navigation', { name: 'Pages of the scratch pad' }).textContent,
    ).toContain('Invoice export')
    expect(screen.getByRole('button', { name: 'Collapse the sidebar' }).textContent).toBe('')
  })

  it('asks to collapse the sidebar when Nick presses the button at the bottom', async () => {
    const onCollapsedChange = vi.fn<(collapsed: boolean) => void>()
    renderSidebar(false, onCollapsedChange)
    await userEvent.click(screen.getByRole('button', { name: 'Collapse the sidebar' }))
    expect(onCollapsedChange).toHaveBeenCalledWith(true)
  })

  it('hides the pages and asks to expand the sidebar when the sidebar is collapsed', async () => {
    const onCollapsedChange = vi.fn<(collapsed: boolean) => void>()
    renderSidebar(true, onCollapsedChange)
    expect(screen.queryByRole('listitem')).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Expand the sidebar' }))
    expect(onCollapsedChange).toHaveBeenCalledWith(false)
  })
})
