import { ScratchPadError } from '../scratch-pad-error'

export const taskStates = ['to-do', 'in-progress', 'done'] as const
export type TaskState = (typeof taskStates)[number]

export const stateTexts: Readonly<Record<TaskState, string>> = {
  'to-do': 'to do',
  'in-progress': 'in progress',
  done: 'done',
}

// The user is Nick, who is the only person that a task or a subtask can be assigned to.
export const assignees = ['user'] as const
export type Assignee = (typeof assignees)[number]

// A task or a subtask that Nick has to do himself, because the agent can't do it
export interface Assignment {
  readonly assignee: Assignee
  // What Nick has to do
  readonly do: string
  // Why the agent can't do it
  readonly why: string
}

interface TaskFields {
  // The id of a task never changes, whereas its number changes when a task is moved. An id is never
  // used again, like t-4.
  readonly id: string
  readonly title: string
  readonly state: TaskState
  // The overview of the task in Markdown, which the agent writes with `task describe`
  readonly description: string | undefined
  // The agent assigns a task or a subtask to Nick with `task assign` or `subtask assign`.
  readonly assignment: Assignment | undefined
}

export interface Subtask extends TaskFields {
  // The number of a subtask starts with the number of its task, like 2.1
  readonly number: string
}

export interface Task extends TaskFields {
  readonly number: number
  // The state of a task with subtasks follows the states of its subtasks.
  readonly subtasks: readonly Subtask[]
}

export type TrackerItem = Task | Subtask

// The number of a subtask on the command line, like 2.1
export interface SubtaskNumber {
  readonly task: number
  readonly subtask: number
}

export interface ProgressTracker {
  readonly title: string
  readonly goal: string | undefined
  readonly tasks: readonly Task[]
}

export interface ChangedItem<T extends TrackerItem> {
  readonly tracker: ProgressTracker
  readonly item: T
}

export interface ItemChange {
  readonly state?: TaskState
  readonly description?: string
  readonly assignment?: Assignment | undefined
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

export class EmptyTaskDescriptionError extends ScratchPadError {
  constructor() {
    super(
      'The description is empty. Write the description in Markdown on standard input, for example with a heredoc.',
    )
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

export class UnknownSubtaskError extends ScratchPadError {
  constructor(number: SubtaskNumber, task: Task) {
    const last = task.subtasks.at(-1)
    super(
      last === undefined
        ? `There isn't any subtask ${subtaskNumberText(number)} because task ${task.number} doesn't have any subtasks yet.`
        : `There isn't any subtask ${subtaskNumberText(number)}. Task ${task.number} has subtasks ${task.number}.1 to ${last.number}.`,
    )
  }
}

export class UnknownTaskIdError extends ScratchPadError {
  constructor(id: string) {
    super(`There isn't any task or subtask with the id ${id} on the progress tracker.`)
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

export function addTask(tracker: ProgressTracker, title: string): ChangedItem<Task> {
  const task: Task = {
    id: nextTaskId(tracker),
    number: tracker.tasks.length + 1,
    title: titleOf(title),
    state: 'to-do',
    description: undefined,
    assignment: undefined,
    subtasks: [],
  }
  return { tracker: { ...tracker, tasks: [...tracker.tasks, task] }, item: task }
}

// A new subtask is to do. The state of its task follows the states of the subtasks. So a done task
// whose other subtasks are done is in progress again, whereas a done task without subtasks is to do.
// The first subtask of the task in progress is in progress, which keeps the task in progress.
export function addSubtask(
  tracker: ProgressTracker,
  taskNumber: number,
  title: string,
): ChangedItem<Subtask> {
  // An assigned task can have subtasks too. The task stays assigned until the agent assigns one of
  // its subtasks so that the assignment doesn't disappear from Nick's Inbox.
  const task = findTask(tracker, taskNumber)
  const first = task.subtasks.length === 0
  const subtask: Subtask = {
    id: nextTaskId(tracker),
    number: subtaskNumberText({ task: taskNumber, subtask: task.subtasks.length + 1 }),
    title: titleOf(title),
    state: first && task.state === 'in-progress' ? 'in-progress' : 'to-do',
    description: undefined,
    assignment: undefined,
  }
  const withSubtask = ordered({
    ...tracker,
    tasks: tracker.tasks.map((each) =>
      each.id === task.id ? { ...each, subtasks: [...each.subtasks, subtask] } : each,
    ),
  })
  return { tracker: withSubtask, item: subtask }
}

export function describeTask(
  tracker: ProgressTracker,
  number: number,
  description: string,
): ChangedItem<Task> {
  const task = findTask(tracker, number)
  const text = descriptionOf(description)
  return {
    tracker: withChanges(tracker, new Map([[task.id, { description: text }]])),
    item: { ...task, description: text },
  }
}

export function describeSubtask(
  tracker: ProgressTracker,
  number: SubtaskNumber,
  description: string,
): ChangedItem<Subtask> {
  const subtask = findSubtask(tracker, number)
  const text = descriptionOf(description)
  return {
    tracker: withChanges(tracker, new Map([[subtask.id, { description: text }]])),
    item: { ...subtask, description: text },
  }
}

export function findTask(tracker: ProgressTracker, number: number): Task {
  const task = tracker.tasks.find((candidate) => candidate.number === number)
  if (task === undefined) {
    throw new UnknownTaskError(number, tracker.tasks.length)
  }
  return task
}

export function findSubtask(tracker: ProgressTracker, number: SubtaskNumber): Subtask {
  const task = findTask(tracker, number.task)
  const subtask = task.subtasks.find((candidate) => candidate.number === subtaskNumberText(number))
  if (subtask === undefined) {
    throw new UnknownSubtaskError(number, task)
  }
  return subtask
}

export function itemWithId(tracker: ProgressTracker, id: string): TrackerItem {
  const item = trackerItems(tracker).find((candidate) => candidate.id === id)
  if (item === undefined) {
    throw new UnknownTaskIdError(id)
  }
  return item
}

export function subtaskNumberText(number: SubtaskNumber): string {
  return `${number.task}.${number.subtask}`
}

// The tasks and their subtasks in the order of the tracker. Each task comes before its subtasks.
export function trackerItems(tracker: ProgressTracker): TrackerItem[] {
  return tracker.tasks.flatMap((task) => [task, ...task.subtasks])
}

// A task that was assigned before the agent added its subtasks. The task stays assigned until the
// agent assigns one of its subtasks.
export function assignedTasksWithSubtasks(tracker: ProgressTracker): Task[] {
  return tracker.tasks.filter((task) => task.assignment !== undefined && task.subtasks.length > 0)
}

export function isSubtask(item: TrackerItem): item is Subtask {
  return typeof item.number === 'string'
}

export function itemKind(item: TrackerItem): 'task' | 'subtask' {
  return isSubtask(item) ? 'subtask' : 'task'
}

// Like "task 2" or "subtask 2.1"
export function itemName(item: TrackerItem): string {
  return `${itemKind(item)} ${item.number}`
}

// Like "Task 2" or "Subtask 2.1", at the start of a sentence
export function itemNameFirst(item: TrackerItem): string {
  return `${isSubtask(item) ? 'Subtask' : 'Task'} ${item.number}`
}

export function withChanges(
  tracker: ProgressTracker,
  changes: ReadonlyMap<string, ItemChange>,
): ProgressTracker {
  return ordered({
    ...tracker,
    tasks: tracker.tasks.map((task) => ({
      ...changed(task, changes),
      subtasks: task.subtasks.map((subtask) => changed(subtask, changes)),
    })),
  })
}

// Numbers each task and each subtask from its place in the tracker so that the numbers always
// follow the order. A task with subtasks takes its state from its subtasks.
export function ordered(tracker: ProgressTracker): ProgressTracker {
  return {
    ...tracker,
    tasks: tracker.tasks.map((task, index) => {
      const number = index + 1
      const subtasks = task.subtasks.map((subtask, position) => ({
        ...subtask,
        number: subtaskNumberText({ task: number, subtask: position + 1 }),
      }))
      const state = subtasks.length === 0 ? task.state : stateOfSubtasks(subtasks)
      return { ...task, number, state, subtasks }
    }),
  }
}

function stateOfSubtasks(subtasks: readonly Subtask[]): TaskState {
  if (subtasks.every((subtask) => subtask.state === 'done')) {
    return 'done'
  }
  return subtasks.every((subtask) => subtask.state === 'to-do') ? 'to-do' : 'in-progress'
}

function changed<T extends TrackerItem>(item: T, changes: ReadonlyMap<string, ItemChange>): T {
  const change = changes.get(item.id)
  return change === undefined ? item : { ...item, ...change }
}

function nextTaskId(tracker: ProgressTracker): string {
  const numbers = trackerItems(tracker).map((item) => Number(item.id.slice('t-'.length)))
  return `t-${Math.max(0, ...numbers) + 1}`
}

function titleOf(title: string): string {
  const text = title.trim()
  if (text === '') {
    throw new EmptyTaskTitleError()
  }
  return text
}

function descriptionOf(description: string): string {
  const text = description.trim()
  if (text === '') {
    throw new EmptyTaskDescriptionError()
  }
  return text
}
