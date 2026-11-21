import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TaskList } from './task-list'

describe('TaskList', () => {
  it('lists each task with its number, its title and its state when it is rendered', () => {
    render(
      <TaskList
        tasks={[
          { number: 1, title: 'Design the export job', state: 'done' },
          { number: 2, title: 'Write the invoice template', state: 'in-progress' },
          { number: 3, title: 'Check the retry limit', state: 'to-do' },
        ]}
      />,
    )
    const tasks = screen.getAllByRole('listitem').map((task) => task.textContent)
    expect(tasks).toStrictEqual([
      '1Design the export jobDone',
      '2Write the invoice templateIn progress',
      '3Check the retry limitTo do',
    ])
  })
})
