import { describe, expect, it } from 'vitest'
import { addSubtask, findTask, UnknownSubtaskError, type ProgressTracker } from './progress-tracker'
import { trackerWithSubtasks, trackerWithTasks } from './progress-tracker-fixtures'
import {
  AssignDoneTaskError,
  AssignTaskWithSubtasksError,
  EmptyAssignmentDoError,
  EmptyAssignmentWhyError,
  assignSubtask,
  assignTask,
} from './task-assignments'

const migration = {
  do: ' Run the migration against staging ',
  why: " The agent can't reach staging ",
}

const assignment = {
  assignee: 'user',
  do: 'Run the migration against staging',
  why: "The agent can't reach staging",
}

// Task 2 was assigned before the agent added its subtasks 2.1 and 2.2.
function assignedTaskWithSubtasks(): ProgressTracker {
  const assigned = assignTask(trackerWithTasks(['to-do', 'to-do']), 2, migration).tracker
  const first = addSubtask(assigned, 2, 'Run the migration against staging').tracker
  return addSubtask(first, 2, 'Check the orders table').tracker
}

describe('assignTask', () => {
  it('assigns the task to the user with the trimmed texts of what to do and why', () => {
    const assigned = assignTask(trackerWithTasks(['to-do', 'to-do']), 2, migration)

    expect([assigned.item.assignment, findTask(assigned.tracker, 2).assignment]).toStrictEqual([
      assignment,
      assignment,
    ])
  })

  it('replaces the assignment when the task was assigned before', () => {
    const before = assignTask(trackerWithTasks(['to-do']), 1, migration).tracker

    const assigned = assignTask(before, 1, { do: 'Check the orders table', why: 'It needs SQL' })

    expect(findTask(assigned.tracker, 1).assignment).toStrictEqual({
      assignee: 'user',
      do: 'Check the orders table',
      why: 'It needs SQL',
    })
  })

  it('throws AssignTaskWithSubtasksError with the list of subtasks when the task has subtasks', () => {
    const assign = () => assignTask(trackerWithSubtasks(['done', 'to-do']), 2, migration)

    expect(assign).toThrow(AssignTaskWithSubtasksError)
    expect(assign).toThrow(
      [
        "Task 2 has subtasks so it can't be assigned as a whole.",
        'Which of its subtasks does Nick have to do?',
        '  2.1  [t-4]  done   Retry a failed export',
        '  2.2  [t-5]  to do  Log each retry',
        'Run "subtask assign <number> --do ... --why ..." for each one.',
      ].join('\n'),
    )
  })

  it('throws AssignDoneTaskError when the task is already done', () => {
    const assign = () => assignTask(trackerWithTasks(['done', 'to-do']), 1, migration)

    expect(assign).toThrow(AssignDoneTaskError)
    expect(assign).toThrow(
      "Task 1 is already done so it can't be assigned to Nick. Assign a task that's still to do, or start this one again with the task start command first.",
    )
  })

  it('throws EmptyAssignmentDoError when the text of what to do is blank', () => {
    const assign = () => assignTask(trackerWithTasks(['to-do']), 1, { ...migration, do: ' ' })

    expect(assign).toThrow(EmptyAssignmentDoError)
    expect(assign).toThrow('The --do text is empty. Write what Nick has to do.')
  })

  it('throws EmptyAssignmentWhyError when the text of why is blank', () => {
    const assign = () => assignTask(trackerWithTasks(['to-do']), 1, { ...migration, why: '' })

    expect(assign).toThrow(EmptyAssignmentWhyError)
    expect(assign).toThrow("The --why text is empty. Write why the agent can't do it.")
  })
})

describe('assignSubtask', () => {
  it('assigns the subtask and leaves its task without an assignment when the task was not assigned', () => {
    const assigned = assignSubtask(
      trackerWithSubtasks(['to-do', 'to-do']),
      { task: 2, subtask: 2 },
      migration,
    )

    expect([
      assigned.item.id,
      assigned.item.assignment,
      findTask(assigned.tracker, 2).subtasks.map((subtask) => subtask.assignment),
      assigned.unassignedTask,
    ]).toStrictEqual(['t-5', assignment, [undefined, assignment], undefined])
  })

  it('removes the assignment of its task when the task was assigned before it had subtasks', () => {
    const assigned = assignSubtask(assignedTaskWithSubtasks(), { task: 2, subtask: 1 }, migration)

    expect([
      findTask(assigned.tracker, 2).assignment,
      assigned.unassignedTask?.id,
      assigned.unassignedTask?.assignment,
    ]).toStrictEqual([undefined, 't-2', undefined])
  })

  it('throws AssignDoneTaskError when the subtask is already done', () => {
    const assign = () =>
      assignSubtask(trackerWithSubtasks(['done', 'to-do']), { task: 2, subtask: 1 }, migration)

    expect(assign).toThrow(AssignDoneTaskError)
    expect(assign).toThrow(
      "Subtask 2.1 is already done so it can't be assigned to Nick. Assign a subtask that's still to do, or start this one again with the subtask start command first.",
    )
  })

  it('throws UnknownSubtaskError when the task does not have the subtask', () => {
    expect(() =>
      assignSubtask(trackerWithSubtasks(['to-do', 'to-do']), { task: 2, subtask: 3 }, migration),
    ).toThrow(UnknownSubtaskError)
  })
})

describe('addSubtask to an assigned task', () => {
  it('adds the subtask and keeps the assignment of the task until a subtask is assigned', () => {
    const task = findTask(assignedTaskWithSubtasks(), 2)

    expect([task.assignment, task.subtasks.map((subtask) => subtask.number)]).toStrictEqual([
      assignment,
      ['2.1', '2.2'],
    ])
  })
})
