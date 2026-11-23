import {
  addSubtask,
  addTask,
  describeSubtask,
  describeTask,
  findSubtask,
  findTask,
  setGoal,
  subtaskNumberText,
  type ChangedItem,
  type ProgressTracker,
  type SubtaskNumber,
  type TrackerItem,
} from '../progress-tracker/progress-tracker'
import {
  addedTaskText,
  finishedTaskText,
  movedTaskText,
  startedTaskText,
  taskLine,
  taskListText,
  taskShowText,
} from '../progress-tracker/progress-tracker-text'
import { moveSubtask, moveTask, type Placement } from '../progress-tracker/task-moves'
import {
  finishSubtask,
  finishTask,
  startSubtask,
  startTask,
  type FinishedTask,
  type StartedTask,
} from '../progress-tracker/task-progress'
import {
  linkLines,
  taskLink,
  textWithLink,
  withLinksNote,
  type ItemLinks,
} from '../item-links/item-links'
import { type EventKind } from '../events/scratch-pad-event'
import { type PadDb } from '../scratch-pad-folder/pad-db'
import { type ScratchPadFolder } from '../scratch-pad-folder/scratch-pad-folder'

export function setGoalOfScratchPad(folder: ScratchPadFolder, goal: string): string {
  return folder.change((pad) => {
    const tracker = setGoal(pad.readProgressTracker(), goal)
    save(pad, tracker, 'goal-set', undefined)
    return `goal: ${tracker.goal}`
  })
}

export function addTaskToTracker(folder: ScratchPadFolder, title: string): string {
  return added(folder, (tracker) => addTask(tracker, title))
}

export function addSubtaskToTracker(
  folder: ScratchPadFolder,
  taskNumber: number,
  title: string,
): string {
  return added(folder, (tracker) => addSubtask(tracker, taskNumber, title))
}

export function describeTaskInTracker(
  folder: ScratchPadFolder,
  number: number,
  description: string,
  links: ItemLinks,
): string {
  return described(folder, links, (tracker) => describeTask(tracker, number, description))
}

export function describeSubtaskInTracker(
  folder: ScratchPadFolder,
  number: SubtaskNumber,
  description: string,
  links: ItemLinks,
): string {
  return described(folder, links, (tracker) => describeSubtask(tracker, number, description))
}

export function showTask(folder: ScratchPadFolder, number: number, links: ItemLinks): string {
  return shown(
    links,
    folder.read((pad) => findTask(pad.readProgressTracker(), number)),
  )
}

export function showSubtask(
  folder: ScratchPadFolder,
  number: SubtaskNumber,
  links: ItemLinks,
): string {
  return shown(
    links,
    folder.read((pad) => findSubtask(pad.readProgressTracker(), number)),
  )
}

export function startTaskInTracker(folder: ScratchPadFolder, number: number): string {
  return started(folder, (tracker) => startTask(tracker, number))
}

export function startSubtaskInTracker(folder: ScratchPadFolder, number: SubtaskNumber): string {
  return started(folder, (tracker) => startSubtask(tracker, number))
}

export function finishTaskInTracker(folder: ScratchPadFolder, number: number): string {
  return finished(folder, (tracker) => finishTask(tracker, number))
}

export function finishSubtaskInTracker(folder: ScratchPadFolder, number: SubtaskNumber): string {
  return finished(folder, (tracker) => finishSubtask(tracker, number))
}

export function moveTaskInTracker(
  folder: ScratchPadFolder,
  number: number,
  placement: Placement<number>,
): string {
  return moved(folder, String(number), (tracker) => moveTask(tracker, number, placement))
}

export function moveSubtaskInTracker(
  folder: ScratchPadFolder,
  number: SubtaskNumber,
  placement: Placement<SubtaskNumber>,
): string {
  return moved(folder, subtaskNumberText(number), (tracker) =>
    moveSubtask(tracker, number, placement),
  )
}

export function listTasks(folder: ScratchPadFolder): string {
  return folder.read((pad) => taskListText(pad.readProgressTracker()))
}

type Change<T> = (tracker: ProgressTracker) => T

function added(folder: ScratchPadFolder, add: Change<ChangedItem<TrackerItem>>): string {
  return folder.change((pad) => {
    const change = add(pad.readProgressTracker())
    save(pad, change.tracker, 'task-added', change.item.id)
    return addedTaskText(change.item)
  })
}

function described(
  folder: ScratchPadFolder,
  links: ItemLinks,
  describe: Change<ChangedItem<TrackerItem>>,
): string {
  const item = folder.change((pad) => {
    const change = describe(pad.readProgressTracker())
    save(pad, change.tracker, 'task-described', change.item.id)
    return change.item
  })
  return textWithLink(links, taskLine(item, 'is described'), taskLink(links, item.id))
}

function shown(links: ItemLinks, item: TrackerItem): string {
  return withLinksNote(links, taskShowText(item, linkLines(taskLink(links, item.id))))
}

function started(folder: ScratchPadFolder, start: Change<StartedTask>): string {
  return folder.change((pad) => {
    const change = start(pad.readProgressTracker())
    save(pad, change.tracker, 'task-started', change.started.id)
    return startedTaskText(change)
  })
}

function finished(folder: ScratchPadFolder, finish: Change<FinishedTask>): string {
  return folder.change((pad) => {
    const change = finish(pad.readProgressTracker())
    save(pad, change.tracker, 'task-done', change.finished.id)
    return finishedTaskText(change)
  })
}

function moved(
  folder: ScratchPadFolder,
  oldNumber: string,
  move: Change<ChangedItem<TrackerItem>>,
): string {
  return folder.change((pad) => {
    const change = move(pad.readProgressTracker())
    save(pad, change.tracker, 'task-moved', change.item.id)
    return movedTaskText(oldNumber, change)
  })
}

function save(pad: PadDb, tracker: ProgressTracker, kind: EventKind, id: string | undefined): void {
  pad.writeProgressTracker(tracker)
  pad.appendEvent({ time: new Date().toISOString(), kind, by: 'agent', item: id })
}
