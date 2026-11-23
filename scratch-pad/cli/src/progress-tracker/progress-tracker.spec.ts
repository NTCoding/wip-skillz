import { describe, expect, it } from 'vitest'
import {
  EmptyGoalError,
  EmptyTaskDescriptionError,
  EmptyTaskTitleError,
  UnknownSubtaskError,
  UnknownTaskError,
  UnknownTaskIdError,
  addSubtask,
  addTask,
  describeSubtask,
  describeTask,
  findSubtask,
  itemWithId,
  newProgressTracker,
  setGoal,
  type ProgressTracker,
} from './progress-tracker'
import { trackerWithSubtasks, trackerWithTasks } from './progress-tracker-fixtures'

const states = (tracker: ProgressTracker) => tracker.tasks.map((task) => task.state)

describe('newProgressTracker', () => {
  it('starts without a goal and without tasks', () => {
    expect(newProgressTracker('Export job')).toStrictEqual({
      title: 'Export job',
      goal: undefined,
      tasks: [],
    })
  })
})

describe('setGoal', () => {
  it('sets the trimmed goal', () => {
    expect(setGoal(trackerWithTasks([]), ' Ship the export job. ').goal).toBe(
      'Ship the export job.',
    )
  })

  it('throws EmptyGoalError when the goal is blank', () => {
    expect(() => setGoal(trackerWithTasks([]), ' ')).toThrow(EmptyGoalError)
    expect(() => setGoal(trackerWithTasks([]), ' ')).toThrow('The goal is empty.')
  })
})

describe('addTask', () => {
  it('adds a task that is to do with the next number and the next id', () => {
    const added = addTask(trackerWithTasks(['done', 'to-do']), ' Write the invoice template ')

    expect(added.item).toStrictEqual({
      id: 't-3',
      number: 3,
      title: 'Write the invoice template',
      state: 'to-do',
      description: undefined,
      assignment: undefined,
      subtasks: [],
    })
  })

  it('gives the new task the id after the highest id of every task and subtask', () => {
    expect(addTask(trackerWithSubtasks(['to-do', 'to-do']), 'Ship the export job').item.id).toBe(
      't-6',
    )
  })

  it('adds the task at the end of the tracker', () => {
    const added = addTask(trackerWithTasks([]), 'Write the invoice template')

    expect(added.tracker.tasks).toStrictEqual([added.item])
  })

  it('throws EmptyTaskTitleError when the title is blank', () => {
    expect(() => addTask(trackerWithTasks([]), '')).toThrow(EmptyTaskTitleError)
    expect(() => addTask(trackerWithTasks([]), '')).toThrow('The task title is empty.')
  })
})

describe('addSubtask', () => {
  it('adds a subtask that is to do after the other subtasks of the task', () => {
    const added = addSubtask(trackerWithSubtasks(['done', 'done']), 2, ' Alert the team ')

    expect(added.item).toStrictEqual({
      id: 't-6',
      number: '2.3',
      title: 'Alert the team',
      state: 'to-do',
      description: undefined,
      assignment: undefined,
    })
  })

  it('numbers the first subtask of a task 1 after the number of the task', () => {
    const added = addSubtask(trackerWithTasks(['to-do', 'to-do']), 2, 'Retry a failed export')

    expect(added.tracker.tasks[1]?.subtasks.map((subtask) => subtask.number)).toStrictEqual(['2.1'])
  })

  it('puts a task whose subtasks were all done back in progress', () => {
    const added = addSubtask(trackerWithSubtasks(['done', 'done']), 2, 'Alert the team')

    expect(states(added.tracker)).toStrictEqual(['to-do', 'in-progress', 'to-do'])
  })

  it('makes a done task without subtasks to do, because its only subtask is to do', () => {
    const added = addSubtask(trackerWithTasks(['done']), 1, 'Alert the team')

    expect([states(added.tracker), added.item.state]).toStrictEqual([['to-do'], 'to-do'])
  })

  it('puts the first subtask of the task in progress in progress, which keeps the task in progress', () => {
    const added = addSubtask(trackerWithTasks(['in-progress']), 1, 'Retry a failed export')

    expect([states(added.tracker), added.item.state]).toStrictEqual([
      ['in-progress'],
      'in-progress',
    ])
  })

  it('adds a later subtask of the task in progress as to do', () => {
    const tracker = addSubtask(
      trackerWithTasks(['in-progress']),
      1,
      'Retry a failed export',
    ).tracker

    expect(addSubtask(tracker, 1, 'Log each retry').item.state).toBe('to-do')
  })

  it('throws EmptyTaskTitleError when the title is blank', () => {
    expect(() => addSubtask(trackerWithTasks(['to-do']), 1, ' ')).toThrow(EmptyTaskTitleError)
  })

  it('throws UnknownTaskError when the tracker does not have the task', () => {
    expect(() => addSubtask(trackerWithTasks(['to-do']), 3, 'Alert the team')).toThrow(
      "There isn't any task 3. The progress tracker has tasks 1 to 1.",
    )
  })
})

describe('describeTask', () => {
  it('replaces the description of the task with the trimmed Markdown', () => {
    const first = describeTask(trackerWithTasks(['to-do', 'to-do']), 2, '- The first version\n')
    const described = describeTask(first.tracker, 2, '\n- The retry limit is 5.\n')

    expect(described.item.description).toBe('- The retry limit is 5.')
    expect(described.tracker.tasks.map((task) => task.description)).toStrictEqual([
      undefined,
      '- The retry limit is 5.',
    ])
  })

  it('throws EmptyTaskDescriptionError when the description is blank', () => {
    const describe = () => describeTask(trackerWithTasks(['to-do']), 1, ' \n')

    expect(describe).toThrow(EmptyTaskDescriptionError)
    expect(describe).toThrow(
      'The description is empty. Write the description in Markdown on standard input, for example with a heredoc.',
    )
  })

  it('throws UnknownTaskError with the range of tasks when the number does not exist', () => {
    const describe = () => describeTask(trackerWithTasks(['to-do', 'to-do']), 9, '- The limit')

    expect(describe).toThrow(UnknownTaskError)
    expect(describe).toThrow("There isn't any task 9. The progress tracker has tasks 1 to 2.")
  })

  it('throws UnknownTaskError that explains there are no tasks when the tracker is empty', () => {
    expect(() => describeTask(trackerWithTasks([]), 1, '- The limit')).toThrow(
      "There isn't any task 1 because the progress tracker doesn't have any tasks yet.",
    )
  })
})

describe('describeSubtask', () => {
  it('replaces the description of the subtask with the trimmed Markdown', () => {
    const described = describeSubtask(
      trackerWithSubtasks(['to-do', 'to-do']),
      { task: 2, subtask: 2 },
      '\n- Each retry is one line of the log.\n',
    )

    expect(findSubtask(described.tracker, { task: 2, subtask: 2 }).description).toStrictEqual(
      '- Each retry is one line of the log.',
    )
  })

  it('throws EmptyTaskDescriptionError when the description is blank', () => {
    expect(() =>
      describeSubtask(trackerWithSubtasks(['to-do', 'to-do']), { task: 2, subtask: 1 }, ''),
    ).toThrow(EmptyTaskDescriptionError)
  })
})

describe('findSubtask', () => {
  it('throws UnknownSubtaskError with the range of subtasks when the number does not exist', () => {
    const find = () => findSubtask(trackerWithSubtasks(['to-do', 'to-do']), { task: 2, subtask: 3 })

    expect(find).toThrow(UnknownSubtaskError)
    expect(find).toThrow("There isn't any subtask 2.3. Task 2 has subtasks 2.1 to 2.2.")
  })

  it('throws UnknownSubtaskError that explains the task has no subtasks yet', () => {
    expect(() =>
      findSubtask(trackerWithSubtasks(['to-do', 'to-do']), { task: 1, subtask: 1 }),
    ).toThrow("There isn't any subtask 1.1 because task 1 doesn't have any subtasks yet.")
  })
})

describe('itemWithId', () => {
  it('returns the subtask with the id', () => {
    expect(itemWithId(trackerWithSubtasks(['to-do', 'done']), 't-5').number).toBe('2.2')
  })

  it('throws UnknownTaskIdError when no task has the id', () => {
    expect(() => itemWithId(trackerWithTasks(['to-do']), 't-9')).toThrow(UnknownTaskIdError)
    expect(() => itemWithId(trackerWithTasks(['to-do']), 't-9')).toThrow(
      "There isn't any task or subtask with the id t-9 on the progress tracker.",
    )
  })
})
