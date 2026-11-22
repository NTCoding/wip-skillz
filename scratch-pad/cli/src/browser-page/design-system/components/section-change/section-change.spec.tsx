import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SectionChange } from './section-change'

class UnreachableServerError extends Error {}

function renderChange(onMarkAsRead: () => Promise<void>) {
  render(
    <SectionChange
      title="Retry limit"
      shownTime="20 Nov, 21:42"
      active={false}
      onMarkAsRead={onMarkAsRead}
    />,
  )
}

describe('SectionChange', () => {
  it('says when the agent changed the section and marks the section as read when Nick clicks the button', async () => {
    const onMarkAsRead = vi.fn(() => new Promise<void>(() => undefined))
    renderChange(onMarkAsRead)
    expect(screen.getByRole('region', { name: 'Retry limit has changed' }).textContent).toBe(
      'This section has changedThe agent changed this section at 20 Nov, 21:42, after you last read it.Mark as read',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Mark as read' }))
    expect(onMarkAsRead).toHaveBeenCalledOnce()
    expect(screen.getByRole('button', { name: 'Mark as read' })).toHaveProperty('disabled', true)
  })

  it('shows the problem and enables the button again when the section couldn’t be marked as read', async () => {
    renderChange(() => Promise.reject(new UnreachableServerError('The server didn’t respond.')))
    await userEvent.click(screen.getByRole('button', { name: 'Mark as read' }))
    expect((await screen.findByRole('alert')).textContent).toBe('The server didn’t respond.')
    expect(screen.getByRole('button', { name: 'Mark as read' })).toHaveProperty('disabled', false)
  })
})
