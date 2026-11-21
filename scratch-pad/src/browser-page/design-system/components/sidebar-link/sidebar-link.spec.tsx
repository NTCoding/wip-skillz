import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Icon } from '../icon/icon'
import { SidebarLink } from './sidebar-link'

function renderLink(current: boolean, onNavigate: (href: string) => void = () => undefined) {
  render(
    <ul>
      <SidebarLink
        href="/pad/invoice-template.md"
        title="Invoice template"
        current={current}
        onNavigate={onNavigate}
      >
        <p>Sections</p>
      </SidebarLink>
    </ul>,
  )
}

describe('SidebarLink', () => {
  it('marks the link as the current page and shows its sections when the page is current', () => {
    renderLink(true)
    expect(screen.getByRole('link').getAttribute('aria-current')).toBe('page')
    expect(screen.getByText('Sections').textContent).toBe('Sections')
  })

  it('hides the sections when the page isn’t current', () => {
    renderLink(false)
    expect(screen.getByRole('link').getAttribute('aria-current')).toBeNull()
    expect(screen.queryByText('Sections')).toBeNull()
  })

  it('shows the icon of a view rather than the icon of a page when the link has an icon', () => {
    const icon = render(<Icon name="progress-tracker" />).container.querySelector('path')
    render(
      <ul>
        <SidebarLink
          href="/pad/progress-tracker"
          icon="progress-tracker"
          title="Progress tracker"
          current={false}
          onNavigate={() => undefined}
        />
      </ul>,
    )
    expect(screen.getByRole('link').querySelector('path')?.getAttribute('d')).toBe(
      icon?.getAttribute('d'),
    )
  })

  it('navigates to the page when Nick clicks the link', async () => {
    const onNavigate = vi.fn<(href: string) => void>()
    renderLink(false, onNavigate)
    await userEvent.click(screen.getByRole('link', { name: 'Invoice template' }))
    expect(onNavigate).toHaveBeenCalledWith('/pad/invoice-template.md')
  })
})
