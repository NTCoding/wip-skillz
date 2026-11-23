import { countedNoun } from '../counted-noun'
import {
  isSubtask,
  itemKind,
  itemName,
  stateTexts,
  trackerItems,
  type ChangedItem,
  type ProgressTracker,
  type Subtask,
  type TrackerItem,
} from './progress-tracker'
import { currentTask, type FinishedTask, type StartedTask } from './task-progress'

export function taskLine(item: TrackerItem, change: string): string {
  return `[${item.id}] ${itemName(item)} ${change}: ${item.title}`
}

// Prints the state and the description of the task. The agent edits the description and writes it
// back with `task describe`. The link of the task is printed under the first line. A task that has
// subtasks lists them after the link.
export function taskShowText(item: TrackerItem, linkLines: readonly string[]): string {
  const subtasks: readonly Subtask[] = isSubtask(item) ? [] : item.subtasks
  return [
    taskLine(item, `is ${stateTexts[item.state]}`),
    ...linkLines,
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

function itemRows(items: readonly TrackerItem[], indent: string): string[] {
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
        item.title,
      ].join('  '),
  )
}

export function currentTaskLine(tracker: ProgressTracker): string {
  const item = currentTask(tracker)
  const total = tracker.tasks.length
  if (item !== undefined) {
    const task = tracker.tasks.find((each) => each.subtasks.some((sub) => sub.id === item.id))
    return task === undefined
      ? `[${item.id}] task ${item.number} of ${total}: ${item.title}`
      : `[${item.id}] subtask ${item.number}: ${item.title} · task ${task.number} of ${total}: ${task.title}`
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
