import { countedNoun } from '../counted-noun'
import {
  assignedTasksWithSubtasks,
  isSubtask,
  itemKind,
  itemName,
  stateTexts,
  trackerItems,
  type Assignment,
  type ChangedItem,
  type ProgressTracker,
  type Subtask,
  type Task,
  type TrackerItem,
} from './progress-tracker'
import { currentTask, type FinishedTask, type StartedTask } from './task-progress'

export const assignEachSubtaskLine =
  'Run "subtask assign <number> --do ... --why ..." for each one.'

export function taskLine(item: TrackerItem, change: string): string {
  return `[${item.id}] ${itemName(item)} ${change}: ${item.title}`
}

// Prints the state and the description of the task. The agent edits the description and writes it
// back with `task describe`. The link of the task is printed under the first line. The assignment
// and the subtasks of the task are printed below the link.
export function taskShowText(item: TrackerItem, linkLines: readonly string[]): string {
  const subtasks: readonly Subtask[] = isSubtask(item) ? [] : item.subtasks
  return [
    taskLine(item, `is ${stateTexts[item.state]}`),
    ...linkLines,
    ...(item.assignment === undefined
      ? []
      : ['assigned to Nick:', ...assignmentLines(item.assignment)]),
    ...(subtasks.length === 0 ? [] : ['subtasks:', ...itemRows(subtasks, '  ')]),
    ...(item.description === undefined
      ? [`there isn't any description yet (write one with ${itemKind(item)} describe)`]
      : ['description:', item.description]),
  ].join('\n')
}

// The first subtask of the task in progress is in progress straight away.
export function addedTaskText(item: TrackerItem): string {
  return [
    taskLine(item, 'added'),
    ...(item.state === 'in-progress'
      ? [taskLine(item, 'is in progress, because its task was in progress')]
      : []),
  ].join('\n')
}

// The task of an assigned subtask isn't assigned any more, because Nick now does the subtasks that
// are assigned to him.
export function assignedTaskText(item: TrackerItem, unassignedTask: Task | undefined): string {
  return [
    taskLine(item, 'is assigned to Nick'),
    ...(unassignedTask === undefined
      ? []
      : [
          taskLine(
            unassignedTask,
            `isn't assigned to Nick any more, because ${itemName(item)} is assigned to him now`,
          ),
        ]),
  ].join('\n')
}

// The agent adds a subtask to an assigned task. The task stays assigned until the agent assigns the
// subtasks that Nick has to do. The agent can reuse the assignment of the task for those subtasks.
export function assignedTaskWithSubtasksLines(task: Task): string[] {
  const { assignment } = task
  return assignment === undefined
    ? []
    : [
        `Task ${task.number} is assigned to Nick and now has subtasks.`,
        'Which subtasks does Nick have to do?',
        assignEachSubtaskLine,
        `The current assignment of task ${task.number}, which you can reuse:`,
        ...assignmentLines(assignment),
      ]
}

// Each problem of the progress tracker that the agent has to fix, like an assigned task with
// subtasks
export function trackerProblemTexts(tracker: ProgressTracker): string[] {
  return assignedTasksWithSubtasks(tracker).map(
    (task) =>
      `task ${task.number} [${task.id}] is assigned to Nick but has subtasks. Run subtask assign for each subtask that Nick has to do`,
  )
}

export function startedTaskText(start: StartedTask): string {
  return [
    taskLine(start.started, start.wasDone ? 'was done and has started again' : 'has started'),
    ...(start.paused === undefined ? [] : [taskLine(start.paused, 'is to do again')]),
  ].join('\n')
}

export function finishedTaskText(finish: FinishedTask): string {
  return [taskLine(finish.finished, 'is done'), nextTaskLine(finish)].join('\n')
}

// A move changes the numbers of the other tasks too. That's why the whole list is printed again.
export function movedTaskText(oldNumber: string, moved: ChangedItem<TrackerItem>): string {
  const { item } = moved
  return [
    `[${item.id}] ${itemKind(item)} ${oldNumber} is now ${itemName(item)}: ${item.title}`,
    taskListText(moved.tracker),
  ].join('\n')
}

export function taskListText(tracker: ProgressTracker): string {
  if (tracker.tasks.length === 0) {
    return "there aren't any tasks yet"
  }
  return itemRows(trackerItems(tracker), '').join('\n')
}

export function itemRows(items: readonly TrackerItem[], indent: string): string[] {
  const numberWidth = Math.max(...items.map((item) => String(item.number).length))
  const idWidth = Math.max(...items.map((item) => item.id.length)) + 2
  const stateWidth = Math.max(...items.map((item) => stateTexts[item.state].length))
  return items.map(
    (item) =>
      indent +
      [
        String(item.number).padEnd(numberWidth),
        `[${item.id}]`.padEnd(idWidth),
        stateTexts[item.state].padEnd(stateWidth),
        markedTitle(item),
      ].join('  '),
  )
}

// What Nick has to do and why the agent can't do it, like on `task show`
function assignmentLines(assignment: Assignment): string[] {
  return [`  do:  ${assignment.do}`, `  why: ${assignment.why}`]
}

// The title of an assigned task or subtask ends with a marker, like "Run the migration · assigned
// to Nick".
function markedTitle(item: TrackerItem): string {
  return item.assignment === undefined ? item.title : `${item.title} · assigned to Nick`
}

// Each part of the line is separated from the next one by a dot. So the part about an assignment
// starts with the task or the subtask that is assigned, like "subtask 2.1 is assigned to Nick".
export function currentTaskLine(tracker: ProgressTracker): string {
  const item = currentTask(tracker)
  const total = tracker.tasks.length
  if (item !== undefined) {
    const task = tracker.tasks.find((each) => each.subtasks.some((sub) => sub.id === item.id))
    const parts =
      task === undefined
        ? [`[${item.id}] task ${item.number} of ${total}: ${item.title}`]
        : [
            `[${item.id}] subtask ${item.number}: ${item.title}`,
            `task ${task.number} of ${total}: ${task.title}`,
          ]
    const assigned = [item, ...(task === undefined ? [] : [task])]
      .filter((each) => each.assignment !== undefined)
      .map((each) => `${itemName(each)} is assigned to Nick`)
    return [...parts, ...assigned].join(' · ')
  }
  if (total === 0) {
    return 'no tasks yet'
  }
  const done = tracker.tasks.filter((candidate) => candidate.state === 'done').length
  return `no task in progress · ${done} of ${countedNoun(total, 'task')} done`
}

function nextTaskLine(finish: FinishedTask): string {
  if (finish.started !== undefined) {
    return taskLine(finish.started, 'has started')
  }
  const current = currentTask(finish.tracker)
  return current === undefined ? 'no task is left to do' : taskLine(current, 'is still in progress')
}
