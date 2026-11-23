import { ScratchPadError } from '../scratch-pad-error'
import {
  findSubtask,
  findTask,
  itemKind,
  itemNameFirst,
  stateTexts,
  withChanges,
  type ProgressTracker,
  type SubtaskNumber,
  type Task,
  type TaskState,
  type TrackerItem,
} from './progress-tracker'

export interface StartedTask {
  readonly tracker: ProgressTracker
  readonly started: TrackerItem
  readonly wasDone: boolean
  readonly paused: TrackerItem | undefined
}

export interface FinishedTask {
  readonly tracker: ProgressTracker
  readonly finished: TrackerItem
  readonly started: TrackerItem | undefined
}

export class TaskAlreadyDoneError extends ScratchPadError {
  constructor(item: TrackerItem) {
    super(
      `${itemNameFirst(item)} is already done. Start it again with the ${itemKind(item)} start command to work on it again.`,
    )
  }
}

// The state of a task with subtasks follows the states of its subtasks. That's why the agent
// starts or finishes one of the subtasks instead.
export class TaskWithSubtasksError extends ScratchPadError {
  constructor(task: Task) {
    super(
      [
        `Task ${task.number} has subtasks, so its state follows the states of its subtasks. Start or finish one of its subtasks instead:`,
        ...task.subtasks.map(
          (subtask) =>
            `  ${subtask.number}  [${subtask.id}]  ${stateTexts[subtask.state]}  ${subtask.title}`,
        ),
      ].join('\n'),
    )
  }
}

// The tasks without subtasks and the subtasks, in the order of the tracker. Only these items have
// a state of their own.
function workItems(tracker: ProgressTracker): TrackerItem[] {
  return tracker.tasks.flatMap((task): TrackerItem[] =>
    task.subtasks.length === 0 ? [task] : [...task.subtasks],
  )
}

// The task or the subtask in progress. A task with subtasks is never the current task, because one
// of its subtasks is.
export function currentTask(tracker: ProgressTracker): TrackerItem | undefined {
  return workItems(tracker).find((item) => item.state === 'in-progress')
}

export function startTask(tracker: ProgressTracker, number: number): StartedTask {
  return started(tracker, taskWithoutSubtasks(tracker, number))
}

export function startSubtask(tracker: ProgressTracker, number: SubtaskNumber): StartedTask {
  return started(tracker, findSubtask(tracker, number))
}

export function finishTask(tracker: ProgressTracker, number: number): FinishedTask {
  return finished(tracker, taskWithoutSubtasks(tracker, number), [])
}

// The next subtask of the same task is started before anything else that's still to do.
export function finishSubtask(tracker: ProgressTracker, number: SubtaskNumber): FinishedTask {
  const siblings = findTask(tracker, number.task).subtasks
  return finished(tracker, findSubtask(tracker, number), siblings)
}

function taskWithoutSubtasks(tracker: ProgressTracker, number: number): Task {
  const task = findTask(tracker, number)
  if (task.subtasks.length > 0) {
    throw new TaskWithSubtasksError(task)
  }
  return task
}

function started(tracker: ProgressTracker, item: TrackerItem): StartedTask {
  const paused = workItems(tracker).find(
    (other) => other.state === 'in-progress' && other.id !== item.id,
  )
  const changes = new Map<string, { state: TaskState }>([[item.id, { state: 'in-progress' }]])
  if (paused !== undefined) {
    changes.set(paused.id, { state: 'to-do' })
  }
  return {
    tracker: withChanges(tracker, changes),
    started: { ...item, state: 'in-progress' },
    wasDone: item.state === 'done',
    paused: paused === undefined ? undefined : { ...paused, state: 'to-do' },
  }
}

function finished(
  tracker: ProgressTracker,
  item: TrackerItem,
  siblings: readonly TrackerItem[],
): FinishedTask {
  if (item.state === 'done') {
    throw new TaskAlreadyDoneError(item)
  }
  const afterFinish = withChanges(tracker, new Map([[item.id, { state: 'done' }]]))
  const next = currentTask(afterFinish) === undefined ? nextToDo(afterFinish, siblings) : undefined
  const finishedItem: TrackerItem = { ...item, state: 'done' }
  if (next === undefined) {
    return { tracker: afterFinish, finished: finishedItem, started: undefined }
  }
  return {
    tracker: withChanges(afterFinish, new Map([[next.id, { state: 'in-progress' }]])),
    finished: finishedItem,
    started: { ...next, state: 'in-progress' },
  }
}

function nextToDo(
  tracker: ProgressTracker,
  siblings: readonly TrackerItem[],
): TrackerItem | undefined {
  // The agent can't do the work that is assigned to Nick so it never starts it.
  const toDo = workItems(tracker).filter(
    (item) => item.state === 'to-do' && item.assignment === undefined,
  )
  return toDo.find((item) => siblings.some((sibling) => sibling.id === item.id)) ?? toDo[0]
}
