import { ScratchPadError } from '../scratch-pad-error'
import {
  findSubtask,
  findTask,
  itemKind,
  itemNameFirst,
  withChanges,
  type Assignment,
  type ChangedItem,
  type ItemChange,
  type ProgressTracker,
  type SubtaskNumber,
  type Task,
  type TrackerItem,
} from './progress-tracker'
import { assignEachSubtaskLine, itemRows } from './progress-tracker-text'

// What Nick has to do and why the agent can't do it, which the agent writes with --do and --why
export interface AssignmentText {
  readonly do: string
  readonly why: string
}

export interface AssignedItem extends ChangedItem<TrackerItem> {
  // The task that was assigned until one of its subtasks was assigned
  readonly unassignedTask: Task | undefined
}

export class EmptyAssignmentDoError extends ScratchPadError {
  constructor() {
    super('The --do text is empty. Write what Nick has to do.')
  }
}

export class EmptyAssignmentWhyError extends ScratchPadError {
  constructor() {
    super("The --why text is empty. Write why the agent can't do it.")
  }
}

// Nick's Inbox only lists the tasks that aren't done yet. That's why the agent only assigns work that
// is still to do. If Nick has to do more work on a task that is done, the agent can start the task
// again first.
export class AssignDoneTaskError extends ScratchPadError {
  constructor(item: TrackerItem) {
    const kind = itemKind(item)
    super(
      `${itemNameFirst(item)} is already done so it can't be assigned to Nick. Assign a ${kind} that's still to do, or start this one again with the ${kind} start command first.`,
    )
  }
}

// The state of a task with subtasks follows the states of its subtasks. That's why the agent assigns
// the subtasks that Nick has to do rather than the whole task.
export class AssignTaskWithSubtasksError extends ScratchPadError {
  constructor(task: Task) {
    super(
      [
        `Task ${task.number} has subtasks so it can't be assigned as a whole.`,
        'Which of its subtasks does Nick have to do?',
        ...itemRows(task.subtasks, '  '),
        assignEachSubtaskLine,
      ].join('\n'),
    )
  }
}

// The new text replaces the assignment of a task that was assigned before.
export function assignTask(
  tracker: ProgressTracker,
  number: number,
  text: AssignmentText,
): AssignedItem {
  const task = findTask(tracker, number)
  if (task.subtasks.length > 0) {
    throw new AssignTaskWithSubtasksError(task)
  }
  if (task.state === 'done') {
    throw new AssignDoneTaskError(task)
  }
  const assignment = assignmentOf(text)
  return {
    tracker: withChanges(tracker, new Map([[task.id, { assignment }]])),
    item: { ...task, assignment },
    unassignedTask: undefined,
  }
}

// The assignment of the subtask's task is removed, because Nick does the assigned subtasks instead
// of the whole task.
export function assignSubtask(
  tracker: ProgressTracker,
  number: SubtaskNumber,
  text: AssignmentText,
): AssignedItem {
  const subtask = findSubtask(tracker, number)
  if (subtask.state === 'done') {
    throw new AssignDoneTaskError(subtask)
  }
  const task = findTask(tracker, number.task)
  const assignment = assignmentOf(text)
  const changes = new Map<string, ItemChange>([[subtask.id, { assignment }]])
  if (task.assignment !== undefined) {
    changes.set(task.id, { assignment: undefined })
  }
  return {
    tracker: withChanges(tracker, changes),
    item: { ...subtask, assignment },
    unassignedTask: task.assignment === undefined ? undefined : { ...task, assignment: undefined },
  }
}

export class NotAssignedError extends ScratchPadError {
  constructor(item: TrackerItem) {
    super(`${itemNameFirst(item)} isn't assigned to Nick so there is nothing to remove.`)
  }
}

// A task that was assigned before the agent split it into subtasks stays assigned. This is how the
// agent removes that assignment when none of the subtasks are Nick's.
export function unassignTask(tracker: ProgressTracker, number: number): ChangedItem<TrackerItem> {
  return unassigned(tracker, findTask(tracker, number))
}

export function unassignSubtask(
  tracker: ProgressTracker,
  number: SubtaskNumber,
): ChangedItem<TrackerItem> {
  return unassigned(tracker, findSubtask(tracker, number))
}

function unassigned(tracker: ProgressTracker, item: TrackerItem): ChangedItem<TrackerItem> {
  if (item.assignment === undefined) {
    throw new NotAssignedError(item)
  }
  return {
    tracker: withChanges(tracker, new Map([[item.id, { assignment: undefined }]])),
    item: { ...item, assignment: undefined },
  }
}

function assignmentOf(text: AssignmentText): Assignment {
  const what = text.do.trim()
  const why = text.why.trim()
  if (what === '') {
    throw new EmptyAssignmentDoError()
  }
  if (why === '') {
    throw new EmptyAssignmentWhyError()
  }
  return { assignee: 'user', do: what, why }
}
