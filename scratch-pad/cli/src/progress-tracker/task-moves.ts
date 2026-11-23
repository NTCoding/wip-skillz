import { ScratchPadError } from '../scratch-pad-error'
import {
  findSubtask,
  findTask,
  itemNameFirst,
  itemWithId,
  ordered,
  subtaskNumberText,
  type ChangedItem,
  type ProgressTracker,
  type SubtaskNumber,
  type TrackerItem,
} from './progress-tracker'

export type Side = 'before' | 'after'

// Where a moved task goes, like before task 2
export interface Placement<N> {
  readonly side: Side
  readonly target: N
}

export class MoveToItselfError extends ScratchPadError {
  constructor(item: TrackerItem, side: Side) {
    super(`${itemNameFirst(item)} can't be moved ${side} itself. Pass the number of another one.`)
  }
}

export class MoveToOtherTaskError extends ScratchPadError {
  constructor(number: SubtaskNumber, target: SubtaskNumber) {
    super(
      `Subtask ${subtaskNumberText(number)} can only be moved among the subtasks of task ${number.task}, but ${subtaskNumberText(target)} is a subtask of task ${target.task}.`,
    )
  }
}

// The tasks are numbered again from the top so that the numbers follow the new order. A task's
// subtasks move together with the task.
export function moveTask(
  tracker: ProgressTracker,
  number: number,
  placement: Placement<number>,
): ChangedItem<TrackerItem> {
  const task = findTask(tracker, number)
  const target = findTask(tracker, placement.target)
  if (target.id === task.id) {
    throw new MoveToItselfError(task, placement.side)
  }
  const after = ordered({ ...tracker, tasks: moved(tracker.tasks, task, target, placement.side) })
  return { tracker: after, item: itemWithId(after, task.id) }
}

export function moveSubtask(
  tracker: ProgressTracker,
  number: SubtaskNumber,
  placement: Placement<SubtaskNumber>,
): ChangedItem<TrackerItem> {
  const subtask = findSubtask(tracker, number)
  if (placement.target.task !== number.task) {
    throw new MoveToOtherTaskError(number, placement.target)
  }
  const target = findSubtask(tracker, placement.target)
  if (target.id === subtask.id) {
    throw new MoveToItselfError(subtask, placement.side)
  }
  const tasks = tracker.tasks.map((task) =>
    task.number === number.task
      ? { ...task, subtasks: moved(task.subtasks, subtask, target, placement.side) }
      : task,
  )
  const after = ordered({ ...tracker, tasks })
  return { tracker: after, item: itemWithId(after, subtask.id) }
}

function moved<T extends TrackerItem>(items: readonly T[], item: T, target: T, side: Side): T[] {
  const others = items.filter((other) => other.id !== item.id)
  const targetIndex = others.findIndex((other) => other.id === target.id)
  const index = side === 'before' ? targetIndex : targetIndex + 1
  return [...others.slice(0, index), item, ...others.slice(index)]
}
