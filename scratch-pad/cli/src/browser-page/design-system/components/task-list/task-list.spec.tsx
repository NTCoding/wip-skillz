import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TaskList, type TaskRow } from './task-list'

const buildTask: TaskRow = {
  id: 't-2',
  number: '2',
  title: 'Build the export job',
  state: 'to-do',
  subtasks: [
    { id: 't-4', number: '2.1', title: 'Retry a failed export', state: 'to-do' },
    { id: 't-5', number: '2.2', title: 'Log each retry', state: 'to-do', anchor: true },
  ],
}

const rowTexts = () => screen.getAllByRole('listitem').map((row) => row.textContent)

describe('TaskList', () => {
  it('lists each task with its number, its title and its state when it is rendered', () => {
    render(
      <TaskList
        tasks={[
          { id: 't-1', number: '1', title: 'Design the export job', state: 'done' },
          { id: 't-2', number: '2', title: 'Write the invoice template', state: 'in-progress' },
          { id: 't-3', number: '3', title: 'Check the retry limit', state: 'to-do' },
        ]}
      />,
    )
    expect(rowTexts()).toStrictEqual([
      '1Design the export jobDone',
      '2Write the invoice templateIn progress',
      '3Check the retry limitTo do',
    ])
  })

  it('links the title of a task that has an address and leaves the other titles as text', () => {
    render(
      <TaskList
        tasks={[
          { id: 't-1', number: '1', title: 'Design the export job', state: 'done', href: '#t-1' },
          { id: 't-2', number: '2', title: 'Check the retry limit', state: 'to-do' },
        ]}
      />,
    )
    expect(
      screen.getAllByRole('link').map((link) => [link.textContent, link.getAttribute('href')]),
    ).toStrictEqual([['Design the export job', '#t-1']])
    expect(screen.getByText('Check the retry limit').tagName).toBe('SPAN')
  })

  it('passes the address of the task to onNavigate when Nick clicks its title', async () => {
    const onNavigate = vi.fn()
    render(
      <TaskList
        tasks={[{ id: 't-1', number: '1', title: 'Design', state: 'done', href: '#t-1' }]}
        onNavigate={onNavigate}
      />,
    )
    await userEvent.click(screen.getByRole('link', { name: 'Design' }))
    expect(onNavigate).toHaveBeenCalledWith('#t-1')
  })

  it('hides the subtasks of a task that is to do until Nick clicks its chevron', async () => {
    render(<TaskList tasks={[buildTask]} />)
    const hidden = rowTexts()
    await userEvent.click(screen.getByRole('button', { name: 'Subtasks of task 2' }))
    expect([hidden, rowTexts().slice(1)]).toStrictEqual([
      ['2Build the export jobTo do'],
      ['2.1Retry a failed exportTo do', '2.2Log each retryTo do'],
    ])
  })

  it('shows the subtasks of a task in progress until Nick clicks its chevron', async () => {
    render(<TaskList tasks={[{ ...buildTask, state: 'in-progress' }]} />)
    const shown = rowTexts().length
    await userEvent.click(screen.getByRole('button', { name: 'Subtasks of task 2' }))
    expect([shown, rowTexts().length]).toStrictEqual([3, 1])
  })

  it('gives the row of a task the id of the task as its anchor when the row is the anchor', () => {
    const { container } = render(
      <TaskList
        tasks={[{ id: 't-1', number: '1', title: 'Design', state: 'done', anchor: true }]}
      />,
    )
    expect(container.querySelector('#t-1')?.textContent).toBe('1DesignDone')
  })

  it('shows the subtasks with the anchor of a subtask when a link points to that subtask', () => {
    const { container } = render(<TaskList tasks={[buildTask]} openTask="t-5" />)
    expect(container.querySelector('#t-5')?.textContent).toBe('2.2Log each retryTo do')
  })

  it('shows the subtasks again when Nick has hidden them and then follows a link to a subtask again', async () => {
    const { rerender } = render(<TaskList tasks={[buildTask]} openTask="t-5" openRequest={1} />)
    await userEvent.click(screen.getByRole('button', { name: 'Subtasks of task 2' }))
    const hidden = rowTexts().length
    rerender(<TaskList tasks={[buildTask]} openTask="t-5" openRequest={2} />)
    expect([hidden, rowTexts().length]).toStrictEqual([1, 3])
  })
})
