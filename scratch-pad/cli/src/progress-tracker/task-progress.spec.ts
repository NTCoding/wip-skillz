import { describe, expect, it } from 'vitest'
import { trackerItems, UnknownTaskError, type ProgressTracker } from './progress-tracker'
import { trackerWithSubtasks, trackerWithTasks } from './progress-tracker-fixtures'
import {
  TaskAlreadyDoneError,
  TaskWithSubtasksError,
  currentTask,
  finishSubtask,
  finishTask,
  startSubtask,
  startTask,
} from './task-progress'

const states = (tracker: ProgressTracker) => tracker.tasks.map((task) => task.state)

// The state of every task and subtask in the order of the tracker, like ['to-do', 'in-progress',
// 'done', 'in-progress', 'to-do'] for task 1, task 2, subtask 2.1, subtask 2.2 and task 3
const allStates = (tracker: ProgressTracker) => trackerItems(tracker).map((item) => item.state)

describe('startTask', () => {
  it('puts the task in progress', () => {
    const start = startTask(trackerWithTasks(['to-do', 'to-do']), 2)

    expect([states(start.tracker), start.started.state]).toStrictEqual([
      ['to-do', 'in-progress'],
      'in-progress',
    ])
  })

  it('puts the task that was in progress back to to do', () => {
    const start = startTask(trackerWithTasks(['in-progress', 'to-do']), 2)

    expect([states(start.tracker), start.paused?.number]).toStrictEqual([
      ['to-do', 'in-progress'],
      1,
    ])
  })

  it('puts the subtask that was in progress back to to do', () => {
    const start = startTask(trackerWithSubtasks(['done', 'in-progress']), 3)

    expect([allStates(start.tracker), start.paused?.number]).toStrictEqual([
      ['to-do', 'in-progress', 'done', 'to-do', 'in-progress'],
      '2.2',
    ])
  })

  it('pauses nothing when the task was already in progress', () => {
    expect(startTask(trackerWithTasks(['in-progress']), 1).paused).toBeUndefined()
  })

  it('records whether the task was done before it started again', () => {
    expect([
      startTask(trackerWithTasks(['done']), 1).wasDone,
      startTask(trackerWithTasks(['to-do']), 1).wasDone,
    ]).toStrictEqual([true, false])
  })

  it('throws TaskWithSubtasksError with the list of subtasks when the task has subtasks', () => {
    const start = () => startTask(trackerWithSubtasks(['done', 'to-do']), 2)

    expect(start).toThrow(TaskWithSubtasksError)
    expect(start).toThrow(
      [
        'Task 2 has subtasks, so its state follows the states of its subtasks. Start or finish one of its subtasks instead:',
        '  2.1  [t-4]  done  Retry a failed export',
        '  2.2  [t-5]  to do  Log each retry',
      ].join('\n'),
    )
  })

  it('throws UnknownTaskError when the number does not exist', () => {
    expect(() => startTask(trackerWithTasks(['to-do']), 9)).toThrow(UnknownTaskError)
  })
})

describe('startSubtask', () => {
  it('puts the subtask in progress, which puts its task in progress', () => {
    const start = startSubtask(trackerWithSubtasks(['to-do', 'to-do']), { task: 2, subtask: 2 })

    expect(allStates(start.tracker)).toStrictEqual([
      'to-do',
      'in-progress',
      'to-do',
      'in-progress',
      'to-do',
    ])
  })

  it('puts the task that was in progress back to to do', () => {
    const tracker = startTask(trackerWithSubtasks(['to-do', 'to-do']), 3).tracker
    const start = startSubtask(tracker, { task: 2, subtask: 1 })

    expect([start.paused?.number, start.started.number]).toStrictEqual([3, '2.1'])
  })
})

describe('finishTask', () => {
  it('finishes the task', () => {
    const finish = finishTask(trackerWithTasks(['done', 'in-progress', 'to-do', 'to-do']), 2)

    expect(finish.finished).toStrictEqual({
      id: 't-2',
      number: 2,
      title: 'Task about retry 2',
      state: 'done',
      description: undefined,
      assignment: undefined,
      subtasks: [],
    })
  })

  it('starts the first task that is to do when no other task is in progress', () => {
    const finish = finishTask(trackerWithTasks(['done', 'in-progress', 'to-do', 'to-do']), 2)

    expect(states(finish.tracker)).toStrictEqual(['done', 'done', 'in-progress', 'to-do'])
  })

  it('starts the first subtask that is to do when the next task has subtasks', () => {
    const finish = finishTask(trackerWithSubtasks(['done', 'to-do']), 1)

    expect([allStates(finish.tracker), finish.started?.number]).toStrictEqual([
      ['done', 'in-progress', 'done', 'in-progress', 'to-do'],
      '2.2',
    ])
  })

  it('starts no task when another task is still in progress', () => {
    const finish = finishTask(trackerWithTasks(['to-do', 'in-progress', 'to-do']), 1)

    expect([states(finish.tracker), finish.started]).toStrictEqual([
      ['done', 'in-progress', 'to-do'],
      undefined,
    ])
  })

  it('starts no task when every task is done', () => {
    const finish = finishTask(trackerWithTasks(['done', 'in-progress']), 2)

    expect([finish.finished.state, finish.started]).toStrictEqual(['done', undefined])
  })

  it('throws TaskAlreadyDoneError when the task is already done', () => {
    const finish = () => finishTask(trackerWithTasks(['done', 'to-do']), 1)

    expect(finish).toThrow(TaskAlreadyDoneError)
    expect(finish).toThrow(
      'Task 1 is already done. Start it again with the task start command to work on it again.',
    )
  })

  it('throws TaskWithSubtasksError when the task has subtasks', () => {
    expect(() => finishTask(trackerWithSubtasks(['done', 'in-progress']), 2)).toThrow(
      TaskWithSubtasksError,
    )
  })
})

describe('finishSubtask', () => {
  it('starts the next subtask of the same task that is to do', () => {
    const tracker = startSubtask(trackerWithSubtasks(['to-do', 'to-do']), {
      task: 2,
      subtask: 1,
    }).tracker
    const finish = finishSubtask(tracker, { task: 2, subtask: 1 })

    expect([allStates(finish.tracker), finish.started?.number]).toStrictEqual([
      ['to-do', 'in-progress', 'done', 'in-progress', 'to-do'],
      '2.2',
    ])
  })

  it('starts the next task that is to do in the order of the tracker after the last subtask', () => {
    const finish = finishSubtask(trackerWithSubtasks(['done', 'in-progress']), {
      task: 2,
      subtask: 2,
    })

    expect([allStates(finish.tracker), finish.started?.number]).toStrictEqual([
      ['in-progress', 'done', 'done', 'done', 'to-do'],
      1,
    ])
  })

  it('throws TaskAlreadyDoneError that names the subtask command when the subtask is done', () => {
    expect(() =>
      finishSubtask(trackerWithSubtasks(['done', 'to-do']), { task: 2, subtask: 1 }),
    ).toThrow(
      'Subtask 2.1 is already done. Start it again with the subtask start command to work on it again.',
    )
  })
})

describe('currentTask', () => {
  it('returns the task in progress', () => {
    expect(currentTask(trackerWithTasks(['done', 'in-progress']))?.number).toBe(2)
  })

  it('returns the subtask in progress rather than its task', () => {
    expect(currentTask(trackerWithSubtasks(['in-progress', 'to-do']))?.number).toBe('2.1')
  })

  it('returns undefined when no task is in progress', () => {
    expect(currentTask(trackerWithTasks(['done', 'to-do']))).toBeUndefined()
  })
})
