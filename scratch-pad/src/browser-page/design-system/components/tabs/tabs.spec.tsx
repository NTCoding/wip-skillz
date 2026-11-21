import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Tabs } from './tabs'

const tabs = [
  { label: 'Pages', href: '/pad/', icon: 'page', current: true },
  { label: 'Decisions', href: '/pad/decisions', icon: 'decision', current: false },
] as const

describe('Tabs', () => {
  it('marks the current tab as the current page when it is rendered', () => {
    render(<Tabs label="Views" tabs={tabs} onNavigate={() => undefined} />)
    expect(screen.getByRole('link', { name: 'Pages' }).getAttribute('aria-current')).toBe('page')
    expect(screen.getByRole('link', { name: 'Decisions' }).getAttribute('aria-current')).toBeNull()
  })

  it('navigates to the tab when Nick clicks it', async () => {
    const onNavigate = vi.fn<(href: string) => void>()
    render(<Tabs label="Views" tabs={tabs} onNavigate={onNavigate} />)
    await userEvent.click(screen.getByRole('link', { name: 'Decisions' }))
    expect(onNavigate).toHaveBeenCalledWith('/pad/decisions')
  })
})
