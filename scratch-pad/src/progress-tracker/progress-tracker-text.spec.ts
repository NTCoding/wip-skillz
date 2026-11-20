import { describe, expect, it } from 'vitest'
import { finishTask, startTask } from './progress-tracker'
import { trackerWithTasks } from './progress-tracker-fixtures'
import {
  currentTaskLine,
  finishedTaskText,
  startedTaskText,
  taskLine,
} from './progress-tracker-text'

describe('taskLine', () => {
  it('prints the number, the change and the title', () => {
    expect(
      taskLine({ number: 3, title: 'Write the invoice template', state: 'to-do' }, 'added'),
    ).toBe('task 3 added: Write the invoice template')
  })
})

describe('startedTaskText', () => {
  it('prints the started task', () => {
    expect(startedTaskText(startTask(trackerWithTasks(['to-do']), 1))).toBe(
      'task 1 has started: Task about retry 1',
    )
  })

  it('prints that the task was done when a done task has started again', () => {
    expect(startedTaskText(startTask(trackerWithTasks(['done']), 1))).toBe(
      'task 1 was done and has started again: Task about retry 1',
    )
  })

  it('prints the paused task on a second line', () => {
    expect(startedTaskText(startTask(trackerWithTasks(['in-progress', 'to-do']), 2))).toBe(
      'task 2 has started: Task about retry 2\ntask 1 is to do again: Task about retry 1',
    )
  })
})

describe('finishedTaskText', () => {
  it('prints the finished task and the started task', () => {
    expect(finishedTaskText(finishTask(trackerWithTasks(['in-progress', 'to-do']), 1))).toBe(
      'task 1 is done: Task about retry 1\ntask 2 has started: Task about retry 2',
    )
  })

  it('prints that no task is left when every task is done', () => {
    expect(finishedTaskText(finishTask(trackerWithTasks(['in-progress']), 1))).toBe(
      'task 1 is done: Task about retry 1\nno task is left to do',
    )
  })

  it('prints the task that is still in progress when another task was finished', () => {
    expect(finishedTaskText(finishTask(trackerWithTasks(['to-do', 'in-progress']), 1))).toBe(
      'task 1 is done: Task about retry 1\ntask 2 is still in progress: Task about retry 2',
    )
  })
})

describe('currentTaskLine', () => {
  it('prints the task in progress and the number of tasks', () => {
    expect(currentTaskLine(trackerWithTasks(['done', 'in-progress', 'to-do']))).toBe(
      'task 2 of 3: Task about retry 2',
    )
  })

  it('prints no tasks yet when the tracker is empty', () => {
    expect(currentTaskLine(trackerWithTasks([]))).toBe('no tasks yet')
  })

  it('prints how many tasks are done when no task is in progress', () => {
    expect(currentTaskLine(trackerWithTasks(['done', 'to-do']))).toBe(
      'no task in progress · 1 of 2 tasks done',
    )
  })
})
