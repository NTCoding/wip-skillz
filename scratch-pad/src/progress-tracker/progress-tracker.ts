import { ScratchPadError } from '../scratch-pad-error'

export const taskStates = ['to-do', 'in-progress', 'done'] as const
export type TaskState = (typeof taskStates)[number]

export interface Task {
  readonly number: number
  readonly title: string
  readonly state: TaskState
}

export interface ProgressTracker {
  readonly title: string
  readonly goal: string | undefined
  readonly tasks: readonly Task[]
}

interface AddedTask {
  readonly tracker: ProgressTracker
  readonly task: Task
}

export interface StartedTask {
  readonly tracker: ProgressTracker
  readonly started: Task
  readonly wasDone: boolean
  readonly paused: Task | undefined
}

export interface FinishedTask {
  readonly tracker: ProgressTracker
  readonly finished: Task
  readonly started: Task | undefined
}

export class EmptyGoalError extends ScratchPadError {
  constructor() {
    super('The goal is empty. Write the goal of the scratch pad.')
  }
}

export class EmptyTaskTitleError extends ScratchPadError {
  constructor() {
    super('The task title is empty. Write the title of the task.')
  }
}

export class UnknownTaskError extends ScratchPadError {
  constructor(number: number, taskCount: number) {
    super(
      taskCount === 0
        ? `There isn't any task ${number} because the progress tracker doesn't have any tasks yet.`
        : `There isn't any task ${number}. The progress tracker has tasks 1 to ${taskCount}.`,
    )
  }
}

export class TaskAlreadyDoneError extends ScratchPadError {
  constructor(number: number) {
    super(
      `Task ${number} is already done. Start it again with the task start command to work on it again.`,
    )
  }
}

export function newProgressTracker(title: string): ProgressTracker {
  return { title, goal: undefined, tasks: [] }
}

export function setGoal(tracker: ProgressTracker, goal: string): ProgressTracker {
  const text = goal.trim()
  if (text === '') {
    throw new EmptyGoalError()
  }
  return { ...tracker, goal: text }
}

export function addTask(tracker: ProgressTracker, title: string): AddedTask {
  const text = title.trim()
  if (text === '') {
    throw new EmptyTaskTitleError()
  }
  const number = Math.max(0, ...tracker.tasks.map((task) => task.number)) + 1
  const task: Task = { number, title: text, state: 'to-do' }
  return { tracker: { ...tracker, tasks: [...tracker.tasks, task] }, task }
}

export function startTask(tracker: ProgressTracker, number: number): StartedTask {
  const started = findTask(tracker, number)
  const paused = tracker.tasks.find(
    (task) => task.state === 'in-progress' && task.number !== number,
  )
  const changes = new Map<number, TaskState>([[number, 'in-progress']])
  if (paused !== undefined) {
    changes.set(paused.number, 'to-do')
  }
  return {
    tracker: withStates(tracker, changes),
    started: { ...started, state: 'in-progress' },
    wasDone: started.state === 'done',
    paused: paused === undefined ? undefined : { ...paused, state: 'to-do' },
  }
}

export function finishTask(tracker: ProgressTracker, number: number): FinishedTask {
  const finished = findTask(tracker, number)
  if (finished.state === 'done') {
    throw new TaskAlreadyDoneError(number)
  }
  const afterFinish = withStates(tracker, new Map([[number, 'done']]))
  const next =
    currentTask(afterFinish) === undefined
      ? afterFinish.tasks.find((task) => task.state === 'to-do')
      : undefined
  if (next === undefined) {
    return { tracker: afterFinish, finished: { ...finished, state: 'done' }, started: undefined }
  }
  return {
    tracker: withStates(afterFinish, new Map([[next.number, 'in-progress']])),
    finished: { ...finished, state: 'done' },
    started: { ...next, state: 'in-progress' },
  }
}

export function currentTask(tracker: ProgressTracker): Task | undefined {
  return tracker.tasks.find((task) => task.state === 'in-progress')
}

function findTask(tracker: ProgressTracker, number: number): Task {
  const task = tracker.tasks.find((candidate) => candidate.number === number)
  if (task === undefined) {
    throw new UnknownTaskError(number, tracker.tasks.length)
  }
  return task
}

function withStates(
  tracker: ProgressTracker,
  changes: ReadonlyMap<number, TaskState>,
): ProgressTracker {
  return {
    ...tracker,
    tasks: tracker.tasks.map((task) => {
      const state = changes.get(task.number)
      return state === undefined ? task : { ...task, state }
    }),
  }
}
