import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TaskChips } from './task-chips'

const tasks = [
  { id: 't-4', label: '2.1 Retry a failed export', href: '#t-4', state: 'done' },
  { id: 't-6', label: '3 Ship the export job', href: '#t-6', state: 'in-progress' },
] as const

describe('TaskChips', () => {
  it('shows a chip with the link and the state of each task when the page is part of 2 tasks', () => {
    render(<TaskChips tasks={tasks} onNavigate={() => undefined} />)
    expect(screen.getAllByRole('listitem').map((chip) => chip.textContent)).toStrictEqual([
      'Part of task2.1 Retry a failed exportDone',
      'Part of task3 Ship the export jobIn progress',
    ])
  })

  it('passes the address of the task to onNavigate when Nick clicks the title of a task', async () => {
    const onNavigate = vi.fn()
    render(<TaskChips tasks={tasks} onNavigate={onNavigate} />)
    await userEvent.click(screen.getByRole('link', { name: '3 Ship the export job' }))
    expect(onNavigate).toHaveBeenCalledWith('#t-6')
  })
})
