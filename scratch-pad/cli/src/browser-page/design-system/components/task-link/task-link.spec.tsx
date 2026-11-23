import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TaskLink } from './task-link'

describe('TaskLink', () => {
  it('passes the address of the task to onNavigate when Nick clicks the link', async () => {
    const onNavigate = vi.fn()
    render(
      <TaskLink href="#t-4" onNavigate={onNavigate}>
        2.1 Retry a failed export
      </TaskLink>,
    )
    await userEvent.click(screen.getByRole('link', { name: '2.1 Retry a failed export' }))
    expect(onNavigate).toHaveBeenCalledWith('#t-4')
  })

  it('shows the text without a link when the task does not have an address', () => {
    render(
      <TaskLink href={undefined} onNavigate={() => undefined}>
        task:t-9
      </TaskLink>,
    )
    expect([screen.queryByRole('link'), screen.getByText('task:t-9').tagName]).toStrictEqual([
      null,
      'SPAN',
    ])
  })
})
