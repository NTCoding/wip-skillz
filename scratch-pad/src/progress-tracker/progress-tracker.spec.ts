import { describe, expect, it } from 'vitest'
import {
  EmptyGoalError,
  EmptyTaskTitleError,
  TaskAlreadyDoneError,
  UnknownTaskError,
  addTask,
  currentTask,
  finishTask,
  newProgressTracker,
  setGoal,
  startTask,
} from './progress-tracker'
import { trackerWithTasks } from './progress-tracker-fixtures'

const states = (tasks: ReturnType<typeof trackerWithTasks>) => tasks.tasks.map((task) => task.state)

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
  it('adds a task that is to do with the next number', () => {
    const added = addTask(trackerWithTasks(['done', 'to-do']), ' Write the invoice template ')

    expect(added.task).toStrictEqual({
      number: 3,
      title: 'Write the invoice template',
      state: 'to-do',
    })
  })

  it('adds the task at the end of the tracker', () => {
    const added = addTask(trackerWithTasks([]), 'Write the invoice template')

    expect(added.tracker.tasks).toStrictEqual([added.task])
  })

  it('throws EmptyTaskTitleError when the title is blank', () => {
    expect(() => addTask(trackerWithTasks([]), '')).toThrow(EmptyTaskTitleError)
    expect(() => addTask(trackerWithTasks([]), '')).toThrow('The task title is empty.')
  })
})

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

  it('pauses nothing when the task was already in progress', () => {
    expect(startTask(trackerWithTasks(['in-progress']), 1).paused).toBeUndefined()
  })

  it('throws UnknownTaskError with the range of tasks when the number does not exist', () => {
    expect(() => startTask(trackerWithTasks(['to-do', 'to-do']), 9)).toThrow(UnknownTaskError)
    expect(() => startTask(trackerWithTasks(['to-do', 'to-do']), 9)).toThrow(
      "There isn't any task 9. The progress tracker has tasks 1 to 2.",
    )
  })

  it('throws UnknownTaskError that explains there are no tasks when the tracker is empty', () => {
    const start = () => startTask(trackerWithTasks([]), 1)

    expect(start).toThrow(UnknownTaskError)
    expect(start).toThrow(
      "There isn't any task 1 because the progress tracker doesn't have any tasks yet.",
    )
  })

  it('records that the task was done when a done task is started again', () => {
    expect(startTask(trackerWithTasks(['done']), 1).wasDone).toBe(true)
  })

  it('records that the task was not done when a task that is to do is started', () => {
    expect(startTask(trackerWithTasks(['to-do']), 1).wasDone).toBe(false)
  })
})

describe('finishTask', () => {
  it('finishes the task', () => {
    const finish = finishTask(trackerWithTasks(['done', 'in-progress', 'to-do', 'to-do']), 2)

    expect(finish.finished).toStrictEqual({ number: 2, title: 'Task about retry 2', state: 'done' })
  })

  it('starts the first task that is to do when no other task is in progress', () => {
    const finish = finishTask(trackerWithTasks(['done', 'in-progress', 'to-do', 'to-do']), 2)

    expect(states(finish.tracker)).toStrictEqual(['done', 'done', 'in-progress', 'to-do'])
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
      'Task 1 is already done. Run "scratch-pad task start 1" to work on it again.',
    )
  })

  it('throws UnknownTaskError when the number does not exist', () => {
    expect(() => finishTask(trackerWithTasks(['to-do']), 2)).toThrow(UnknownTaskError)
    expect(() => finishTask(trackerWithTasks(['to-do']), 2)).toThrow("There isn't any task 2.")
  })
})

describe('currentTask', () => {
  it('returns the task in progress', () => {
    expect(currentTask(trackerWithTasks(['done', 'in-progress']))?.number).toBe(2)
  })

  it('returns undefined when no task is in progress', () => {
    expect(currentTask(trackerWithTasks(['done', 'to-do']))).toBeUndefined()
  })
})
