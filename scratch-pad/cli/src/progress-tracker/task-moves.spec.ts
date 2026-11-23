import { describe, expect, it } from 'vitest'
import { addTask, trackerItems, UnknownTaskError, type ProgressTracker } from './progress-tracker'
import { trackerWithSubtasks } from './progress-tracker-fixtures'
import { MoveToItselfError, MoveToOtherTaskError, moveSubtask, moveTask } from './task-moves'

// Each task and subtask as its number and its id, like 2.1 t-4
const numbersAndIds = (tracker: ProgressTracker) =>
  trackerItems(tracker).map((item) => `${item.number} ${item.id}`)

describe('moveTask', () => {
  const tracker = addTask(
    trackerWithSubtasks(['done', 'to-do']),
    'Agree the retry limit with Jo',
  ).tracker

  it('moves the task before the target and numbers every task again together with its subtasks', () => {
    const moved = moveTask(tracker, 2, { side: 'before', target: 1 })

    expect(numbersAndIds(moved.tracker)).toStrictEqual([
      '1 t-2',
      '1.1 t-4',
      '1.2 t-5',
      '2 t-1',
      '3 t-3',
      '4 t-6',
    ])
  })

  it('moves the task after the target and returns the task with its new number', () => {
    const moved = moveTask(tracker, 4, { side: 'after', target: 1 })

    expect([moved.item.number, moved.tracker.tasks.map((task) => task.id)]).toStrictEqual([
      2,
      ['t-1', 't-6', 't-2', 't-3'],
    ])
  })

  it('throws MoveToItselfError when the target is the task itself', () => {
    const move = () => moveTask(tracker, 2, { side: 'after', target: 2 })

    expect(move).toThrow(MoveToItselfError)
    expect(move).toThrow("Task 2 can't be moved after itself. Pass the number of another one.")
  })

  it('throws UnknownTaskError when the target does not exist', () => {
    expect(() => moveTask(tracker, 2, { side: 'before', target: 7 })).toThrow(UnknownTaskError)
  })
})

describe('moveSubtask', () => {
  const tracker = trackerWithSubtasks(['done', 'to-do'])

  it('moves the subtask among the subtasks of its task and numbers them again', () => {
    const moved = moveSubtask(
      tracker,
      { task: 2, subtask: 2 },
      {
        side: 'before',
        target: { task: 2, subtask: 1 },
      },
    )

    expect([
      moved.item.number,
      moved.tracker.tasks[1]?.subtasks.map((each) => each.id),
    ]).toStrictEqual(['2.1', ['t-5', 't-4']])
  })

  it('throws MoveToOtherTaskError when the target is a subtask of another task', () => {
    const move = () =>
      moveSubtask(
        tracker,
        { task: 2, subtask: 1 },
        {
          side: 'after',
          target: { task: 3, subtask: 1 },
        },
      )

    expect(move).toThrow(MoveToOtherTaskError)
    expect(move).toThrow(
      'Subtask 2.1 can only be moved among the subtasks of task 2, but 3.1 is a subtask of task 3.',
    )
  })

  it('throws MoveToItselfError when the target is the subtask itself', () => {
    expect(() =>
      moveSubtask(
        tracker,
        { task: 2, subtask: 1 },
        {
          side: 'before',
          target: { task: 2, subtask: 1 },
        },
      ),
    ).toThrow("Subtask 2.1 can't be moved before itself.")
  })
})
