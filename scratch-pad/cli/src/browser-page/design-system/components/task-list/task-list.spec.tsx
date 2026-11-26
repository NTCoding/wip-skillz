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

const runFirstExport = {
  do: (
    <>
      <p>Run the export job by hand.</p>
      <p>Keep the terminal open until the summary is printed.</p>
    </>
  ),
  why: <p>The production key is only on your laptop.</p>,
  descriptionHref: '#t-8-description',
}

// Subtask 4.2 is assigned to Nick and subtask 4.1 isn't.
const goLive: TaskRow = {
  id: 't-4',
  number: '4',
  title: 'Go live with the export job',
  state: 'to-do',
  subtasks: [
    { id: 't-7', number: '4.1', title: 'Write the runbook', state: 'to-do' },
    {
      id: 't-8',
      number: '4.2',
      title: 'Run the first export',
      state: 'to-do',
      anchor: true,
      assignment: runFirstExport,
    },
  ],
}

const askFinance: TaskRow = {
  id: 't-10',
  number: '5',
  title: 'Ask the finance team',
  state: 'to-do',
  href: '#t-10-description',
  anchor: true,
  assignment: {
    do: 'Ask how the tax is rounded.',
    why: 'The agent can’t email.',
    descriptionHref: undefined,
  },
}

const marks = () => screen.queryAllByRole('img').map((mark) => mark.getAttribute('aria-label'))

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

  it('marks a task that is assigned to Nick and doesn’t mark the other tasks', () => {
    render(
      <TaskList tasks={[{ id: 't-1', number: '1', title: 'Design', state: 'done' }, askFinance]} />,
    )
    expect([
      marks(),
      document.querySelector('.task-list')?.getAttribute('data-marks'),
    ]).toStrictEqual([['Assigned to you'], 'true'])
  })

  // In a narrow list, the title of a row without a mark takes the column of the mark.
  it('doesn’t add an element for the mark to a row without a mark', () => {
    const { container } = render(
      <TaskList tasks={[{ id: 't-1', number: '1', title: 'Design', state: 'done' }, askFinance]} />,
    )
    expect(
      [...container.querySelectorAll('.task-list__task')].map(
        (row) => row.querySelectorAll('.task-list__mark').length,
      ),
    ).toStrictEqual([0, 1])
  })

  it('doesn’t add a column for the marks to a list without any assigned tasks', () => {
    const { container } = render(
      <TaskList tasks={[{ id: 't-1', number: '1', title: 'Design', state: 'done' }]} />,
    )
    expect([
      container.querySelector('.task-list')?.getAttribute('data-marks'),
      container.querySelectorAll('.task-list__mark').length,
    ]).toStrictEqual(['false', 0])
  })

  it('shows what Nick has to do and why when Nick clicks the row of an assigned task and hides it again', async () => {
    render(<TaskList tasks={[askFinance]} />)
    const row = screen.getByRole('button', { name: /Ask the finance team/ })
    await userEvent.click(row)
    const shown = rowTexts()
    await userEvent.click(row)
    expect([shown, rowTexts(), row.getAttribute('aria-expanded')]).toStrictEqual([
      [
        '5Ask the finance teamTo doWhat you need to doAsk how the tax is rounded.Why the agent can’t do the taskThe agent can’t email.',
      ],
      ['5Ask the finance teamTo do'],
      'false',
    ])
  })

  it('doesn’t link the title of an assigned task, because its row is a button', () => {
    render(<TaskList tasks={[askFinance]} />)
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('opens the details of an assigned subtask and the subtasks of its task when a link points to the subtask', () => {
    const { container } = render(<TaskList tasks={[goLive]} openTask="t-8" />)
    expect([
      container.querySelector('#t-8')?.getAttribute('aria-expanded'),
      screen.getByRole('button', { name: /Run the first export/ }).getAttribute('aria-controls'),
      screen.getAllByText(/^Why the agent/).map((label) => label.textContent),
    ]).toStrictEqual(['true', 't-8-details', ['Why the agent can’t do the subtask']])
  })

  it('shows each paragraph of what Nick has to do on its own', () => {
    render(<TaskList tasks={[goLive]} openTask="t-8" />)
    expect(
      [...document.querySelectorAll('.task-list__text > p')].map(
        (paragraph) => paragraph.textContent,
      ),
    ).toStrictEqual([
      'Run the export job by hand.',
      'Keep the terminal open until the summary is printed.',
      'The production key is only on your laptop.',
    ])
  })

  it('passes the address of the description to onNavigate when Nick clicks the link in the details', async () => {
    const onNavigate = vi.fn()
    render(<TaskList tasks={[goLive]} openTask="t-8" onNavigate={onNavigate} />)
    await userEvent.click(screen.getByRole('link', { name: 'Read the description' }))
    expect(onNavigate).toHaveBeenCalledWith('#t-8-description')
  })

  it('links to the description in the details without onNavigate', () => {
    render(<TaskList tasks={[goLive]} openTask="t-8" />)
    expect(screen.getByRole('link', { name: 'Read the description' }).getAttribute('href')).toBe(
      '#t-8-description',
    )
  })

  it('shows a dot on a task when one of its subtasks is assigned to Nick', () => {
    render(<TaskList tasks={[goLive]} />)
    expect(marks()).toStrictEqual(['A subtask of this task is assigned to you'])
  })

  it('shows a dot on a task when several of its subtasks are assigned to Nick', () => {
    const subtasks = (goLive.subtasks ?? []).map((subtask) => ({
      ...subtask,
      assignment: runFirstExport,
    }))
    render(<TaskList tasks={[{ ...goLive, subtasks }]} />)
    expect(marks()).toStrictEqual(['Subtasks of this task are assigned to you'])
  })

  it('points the row of an assigned task with subtasks at its details and its subtasks', async () => {
    const { container } = render(<TaskList tasks={[{ ...goLive, assignment: runFirstExport }]} />)
    const row = screen.getByRole('button', { name: /Go live with the export job/ })
    await userEvent.click(row)
    const ids = row.getAttribute('aria-controls')?.split(' ') ?? []
    expect([ids, ids.map((id) => container.querySelector(`#${id}`)?.className)]).toStrictEqual([
      ['t-4-details', 't-4-subtasks'],
      ['task-list__details', 'task-list__subtasks'],
    ])
  })

  it('shows the details and the subtasks of a task with subtasks that is still assigned to Nick', async () => {
    render(<TaskList tasks={[{ ...goLive, assignment: runFirstExport }]} />)
    await userEvent.click(screen.getByRole('button', { name: /Go live with the export job/ }))
    expect([
      screen.getAllByText('What you need to do').length,
      rowTexts()
        .slice(1)
        .map((row) => row?.slice(0, 20)),
    ]).toStrictEqual([1, ['4.1Write the runbook', '4.2Run the first exp']])
  })
})

// Task 5 has a thread whose card is c-4. The card is a plain paragraph here.
const askFinanceWithThread: TaskRow = {
  ...askFinance,
  thread: { id: 'c-4', content: () => <p>Which invoices are rounded?</p> },
}

// Subtask 4.2 has a thread without any messages yet, whose content closes the thread.
const goLiveWithThread: TaskRow = {
  ...goLive,
  subtasks: (goLive.subtasks ?? []).map((subtask) =>
    subtask.id === 't-8'
      ? {
          ...subtask,
          thread: {
            id: undefined,
            content: (close: () => void) => (
              <button type="button" onClick={close}>
                Close the thread
              </button>
            ),
          },
        }
      : subtask,
  ),
}

describe('the thread of a task in the TaskList', () => {
  it('shows the content of the thread below the row when Nick clicks the speech bubble and hides it again', async () => {
    render(<TaskList tasks={[askFinanceWithThread]} />)
    const bubble = screen.getByRole('button', { name: 'Thread on task 5' })
    await userEvent.click(bubble)
    const shown = [
      screen.queryByText('Which invoices are rounded?'),
      bubble.getAttribute('aria-controls'),
    ]
    await userEvent.click(bubble)

    expect([
      shown[0] === null,
      shown[1],
      screen.queryByText('Which invoices are rounded?'),
      bubble.getAttribute('aria-expanded'),
    ]).toStrictEqual([false, 't-10-thread', null, 'false'])
  })

  it('opens the thread of a task when a link points to the thread', () => {
    render(<TaskList tasks={[askFinanceWithThread]} openTask="c-4" />)

    expect(screen.getByText('Which invoices are rounded?').closest('[id]')?.id).toBe('t-10-thread')
  })

  it('closes the thread of a subtask when its content calls close', async () => {
    render(<TaskList tasks={[goLiveWithThread]} />)
    await userEvent.click(screen.getByRole('button', { name: /Subtasks of task 4/u }))
    await userEvent.click(screen.getByRole('button', { name: 'Thread on subtask 4.2' }))
    await userEvent.click(screen.getByRole('button', { name: 'Close the thread' }))

    expect(screen.queryByRole('button', { name: 'Close the thread' })).toBeNull()
  })

  it('only shows a speech bubble on the rows that have a thread', () => {
    render(<TaskList tasks={[goLiveWithThread]} openTask="t-8" />)

    expect(
      screen
        .getAllByRole('button', { name: /^Thread on/u })
        .map((bubble) => bubble.getAttribute('aria-label')),
    ).toStrictEqual(['Thread on subtask 4.2'])
  })

  it('doesn’t show any speech bubbles in a list without any threads', () => {
    render(<TaskList tasks={[askFinance]} />)

    expect(screen.queryAllByRole('button', { name: /^Thread on/u })).toStrictEqual([])
  })
})
