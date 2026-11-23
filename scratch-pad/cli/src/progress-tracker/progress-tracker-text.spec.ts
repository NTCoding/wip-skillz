import { describe, expect, it } from 'vitest'
import { addSubtask, findSubtask, findTask, type ProgressTracker } from './progress-tracker'
import { trackerWithSubtasks, trackerWithTasks } from './progress-tracker-fixtures'
import {
  assignedTaskText,
  assignedTaskWithSubtasksLines,
  currentTaskLine,
  finishedTaskText,
  movedTaskText,
  startedTaskText,
  taskLine,
  taskListText,
  taskShowText,
  trackerProblemTexts,
} from './progress-tracker-text'
import { assignSubtask, assignTask } from './task-assignments'
import { moveTask } from './task-moves'
import { finishTask, startTask } from './task-progress'

const migration = {
  do: 'Run the migration against staging',
  why: "The agent can't reach staging",
}

// Subtask 2.2 is in progress and assigned to Nick. Task 3 is assigned to Nick too.
function trackerWithAssignments(): ProgressTracker {
  const subtask = assignSubtask(
    trackerWithSubtasks(['done', 'in-progress']),
    { task: 2, subtask: 2 },
    migration,
  )
  return assignTask(subtask.tracker, 3, migration).tracker
}

// Task 2 was assigned before the agent added its subtask 2.1.
function assignedTaskWithSubtask(): ProgressTracker {
  const assigned = assignTask(trackerWithTasks(['to-do', 'to-do']), 2, migration).tracker
  return addSubtask(assigned, 2, 'Run the migration against staging').tracker
}

describe('taskLine', () => {
  it('prints the id, the number, the change and the title of a task', () => {
    expect(taskLine(findTask(trackerWithTasks(['to-do', 'to-do', 'to-do']), 3), 'added')).toBe(
      '[t-3] task 3 added: Task about retry 3',
    )
  })

  it('prints the number of a subtask after the word subtask', () => {
    const subtask = findSubtask(trackerWithSubtasks(['to-do', 'to-do']), { task: 2, subtask: 1 })

    expect(taskLine(subtask, 'added')).toBe('[t-4] subtask 2.1 added: Retry a failed export')
  })
})

describe('startedTaskText', () => {
  it('prints the started task', () => {
    expect(startedTaskText(startTask(trackerWithTasks(['to-do']), 1))).toBe(
      '[t-1] task 1 has started: Task about retry 1',
    )
  })

  it('prints that the task was done when a done task has started again', () => {
    expect(startedTaskText(startTask(trackerWithTasks(['done']), 1))).toBe(
      '[t-1] task 1 was done and has started again: Task about retry 1',
    )
  })

  it('prints the paused task on a second line', () => {
    expect(startedTaskText(startTask(trackerWithTasks(['in-progress', 'to-do']), 2))).toBe(
      '[t-2] task 2 has started: Task about retry 2\n[t-1] task 1 is to do again: Task about retry 1',
    )
  })
})

describe('finishedTaskText', () => {
  it('prints the finished task and the started task', () => {
    expect(finishedTaskText(finishTask(trackerWithTasks(['in-progress', 'to-do']), 1))).toBe(
      '[t-1] task 1 is done: Task about retry 1\n[t-2] task 2 has started: Task about retry 2',
    )
  })

  it('prints that no task is left when every task is done', () => {
    expect(finishedTaskText(finishTask(trackerWithTasks(['in-progress']), 1))).toBe(
      '[t-1] task 1 is done: Task about retry 1\nno task is left to do',
    )
  })

  it('prints the task that is still in progress when another task was finished', () => {
    expect(finishedTaskText(finishTask(trackerWithTasks(['to-do', 'in-progress']), 1))).toBe(
      '[t-1] task 1 is done: Task about retry 1\n[t-2] task 2 is still in progress: Task about retry 2',
    )
  })
})

describe('movedTaskText', () => {
  it('prints the old and the new number of the task and then every task with its new number', () => {
    const moved = moveTask(trackerWithTasks(['done', 'to-do', 'to-do']), 3, {
      side: 'before',
      target: 2,
    })

    expect(movedTaskText('3', moved)).toBe(
      [
        '[t-3] task 3 is now task 2: Task about retry 3',
        '1  [t-1]  done   Task about retry 1',
        '2  [t-3]  to do  Task about retry 3',
        '3  [t-2]  to do  Task about retry 2',
      ].join('\n'),
    )
  })
})

describe('currentTaskLine', () => {
  it('prints the task in progress and the number of tasks', () => {
    expect(currentTaskLine(trackerWithTasks(['done', 'in-progress', 'to-do']))).toBe(
      '[t-2] task 2 of 3: Task about retry 2',
    )
  })

  it('prints the subtask in progress and then its task when a subtask is in progress', () => {
    expect(currentTaskLine(trackerWithSubtasks(['done', 'in-progress']))).toBe(
      '[t-5] subtask 2.2: Log each retry · task 2 of 3: Task about retry 2',
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

describe('taskListText', () => {
  it('prints one aligned line per task with its number, id, state and title when there are tasks', () => {
    const tracker = trackerWithTasks(['done', 'in-progress', ...Array<'to-do'>(8).fill('to-do')])

    expect(taskListText(tracker).split('\n').slice(0, 3)).toStrictEqual([
      '1   [t-1]   done         Task about retry 1',
      '2   [t-2]   in progress  Task about retry 2',
      '3   [t-3]   to do        Task about retry 3',
    ])
  })

  it('prints each subtask on a line after its task', () => {
    expect(taskListText(trackerWithSubtasks(['done', 'in-progress'])).split('\n')).toStrictEqual([
      '1    [t-1]  to do        Task about retry 1',
      '2    [t-2]  in progress  Task about retry 2',
      '2.1  [t-4]  done         Retry a failed export',
      '2.2  [t-5]  in progress  Log each retry',
      '3    [t-3]  to do        Task about retry 3',
    ])
  })

  it('prints that there are no tasks when the progress tracker is empty', () => {
    expect(taskListText(trackerWithTasks([]))).toBe("there aren't any tasks yet")
  })
})

describe('taskShowText', () => {
  const task = {
    ...findTask(trackerWithTasks(['to-do', 'in-progress']), 2),
    description: '- The template shows [the tax number](invoice-template.md#tax-number).',
  }

  it('prints the state, the link and the Markdown of the description', () => {
    expect(taskShowText(task, ['link: http://127.0.0.1:4747/pad/progress-tracker#t-2'])).toBe(
      [
        '[t-2] task 2 is in progress: Task about retry 2',
        'link: http://127.0.0.1:4747/pad/progress-tracker#t-2',
        'description:',
        '- The template shows [the tax number](invoice-template.md#tax-number).',
      ].join('\n'),
    )
  })

  it('prints that the task does not have a description yet when it was never described', () => {
    expect(taskShowText({ ...task, state: 'to-do', description: undefined }, [])).toBe(
      [
        '[t-2] task 2 is to do: Task about retry 2',
        "there isn't any description yet (write one with task describe)",
      ].join('\n'),
    )
  })

  it('lists the subtasks of a task that has subtasks', () => {
    expect(taskShowText(findTask(trackerWithSubtasks(['done', 'to-do']), 2), [])).toBe(
      [
        '[t-2] task 2 is in progress: Task about retry 2',
        'subtasks:',
        '  2.1  [t-4]  done   Retry a failed export',
        '  2.2  [t-5]  to do  Log each retry',
        "there isn't any description yet (write one with task describe)",
      ].join('\n'),
    )
  })

  it('tells the agent to write the description of a subtask with subtask describe', () => {
    expect(
      taskShowText(
        findSubtask(trackerWithSubtasks(['done', 'to-do']), { task: 2, subtask: 1 }),
        [],
      ),
    ).toBe(
      [
        '[t-4] subtask 2.1 is done: Retry a failed export',
        "there isn't any description yet (write one with subtask describe)",
      ].join('\n'),
    )
  })
})

describe('the assignments to Nick', () => {
  it('marks each assigned task and subtask in the list of tasks', () => {
    expect(taskListText(trackerWithAssignments()).split('\n').slice(1)).toStrictEqual([
      '2    [t-2]  in progress  Task about retry 2',
      '2.1  [t-4]  done         Retry a failed export',
      '2.2  [t-5]  in progress  Log each retry · assigned to Nick',
      '3    [t-3]  to do        Task about retry 3 · assigned to Nick',
    ])
  })

  it('prints what Nick has to do and why after the link of an assigned task', () => {
    expect(
      taskShowText(findTask(trackerWithAssignments(), 3), ['link: http://127.0.0.1:4747/pad/x']),
    ).toBe(
      [
        '[t-3] task 3 is to do: Task about retry 3',
        'link: http://127.0.0.1:4747/pad/x',
        'assigned to Nick:',
        '  do:  Run the migration against staging',
        "  why: The agent can't reach staging",
        "there isn't any description yet (write one with task describe)",
      ].join('\n'),
    )
  })

  it('writes which subtask is assigned to Nick at the end of the line of the subtask in progress', () => {
    expect(currentTaskLine(trackerWithAssignments())).toBe(
      '[t-5] subtask 2.2: Log each retry · task 2 of 3: Task about retry 2 · subtask 2.2 is assigned to Nick',
    )
  })

  it('writes which task is assigned to Nick when its subtask in progress is not assigned', () => {
    const assigned = assignTask(trackerWithTasks(['to-do', 'in-progress']), 2, migration).tracker
    const tracker = addSubtask(assigned, 2, 'Run the migration against staging').tracker

    expect(currentTaskLine(tracker)).toBe(
      '[t-3] subtask 2.1: Run the migration against staging · task 2 of 2: Task about retry 2 · task 2 is assigned to Nick',
    )
  })

  it('writes that the task in progress is assigned to Nick at the end of its line', () => {
    const tracker = assignTask(trackerWithTasks(['in-progress']), 1, migration).tracker

    expect(currentTaskLine(tracker)).toBe(
      '[t-1] task 1 of 1: Task about retry 1 · task 1 is assigned to Nick',
    )
  })

  it('prints the assigned subtask and the task that is not assigned any more', () => {
    const assigned = assignSubtask(assignedTaskWithSubtask(), { task: 2, subtask: 1 }, migration)

    expect(assignedTaskText(assigned.item, assigned.unassignedTask)).toBe(
      [
        '[t-3] subtask 2.1 is assigned to Nick: Run the migration against staging',
        "[t-2] task 2 isn't assigned to Nick any more, because subtask 2.1 is assigned to him now: Task about retry 2",
      ].join('\n'),
    )
  })

  it('asks which subtasks Nick has to do and prints the assignment of the task when the task is assigned', () => {
    expect(assignedTaskWithSubtasksLines(findTask(assignedTaskWithSubtask(), 2))).toStrictEqual([
      'Task 2 is assigned to Nick and now has subtasks.',
      'Which subtasks does Nick have to do?',
      'Run "subtask assign <number> --do ... --why ..." for each one.',
      'The current assignment of task 2, which you can reuse:',
      '  do:  Run the migration against staging',
      "  why: The agent can't reach staging",
    ])
  })

  it("doesn't print anything about an assignment when the task isn't assigned", () => {
    expect(
      assignedTaskWithSubtasksLines(findTask(trackerWithSubtasks(['done', 'done']), 2)),
    ).toStrictEqual([])
  })

  it('reports each assigned task that has subtasks as a problem of the progress tracker', () => {
    expect([
      trackerProblemTexts(assignedTaskWithSubtask()),
      trackerProblemTexts(trackerWithAssignments()),
    ]).toStrictEqual([
      [
        'task 2 [t-2] is assigned to Nick but has subtasks. Run subtask assign for each subtask that Nick has to do',
      ],
      [],
    ])
  })
})
