import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { NewPageLine } from './new-page-line'

class UnreachableServerError extends Error {}

describe('NewPageLine', () => {
  it('says that the page is new and marks it as read when Nick clicks the button', async () => {
    const onMarkAsRead = vi.fn(() => Promise.resolve())
    render(<NewPageLine onMarkAsRead={onMarkAsRead} />)
    expect(screen.getByText('This page is new.').textContent).toBe('This page is new.')
    await userEvent.click(screen.getByRole('button', { name: 'Mark as read' }))
    expect(onMarkAsRead).toHaveBeenCalledOnce()
    expect(screen.getByRole('button', { name: 'Mark as read' })).toHaveProperty('disabled', false)
  })

  it('shows the problem when the page couldn’t be marked as read', async () => {
    render(
      <NewPageLine
        onMarkAsRead={() =>
          Promise.reject(new UnreachableServerError('The server didn’t respond.'))
        }
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Mark as read' }))
    expect((await screen.findByRole('alert')).textContent).toBe('The server didn’t respond.')
  })
})
