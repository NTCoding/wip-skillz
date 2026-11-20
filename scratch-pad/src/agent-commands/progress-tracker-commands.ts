import {
  addTask,
  finishTask,
  setGoal,
  startTask,
  type ProgressTracker,
} from '../progress-tracker/progress-tracker'
import {
  finishedTaskText,
  startedTaskText,
  taskLine,
} from '../progress-tracker/progress-tracker-text'
import { nextEvent, type EventKind } from '../events/scratch-pad-event'
import { type ScratchPadFolder } from '../scratch-pad-folder/scratch-pad-folder'

export function setGoalOfScratchPad(folder: ScratchPadFolder, goal: string): string {
  const tracker = setGoal(folder.readProgressTracker(), goal)
  save(folder, tracker, 'goal-set', undefined)
  return `goal: ${tracker.goal}`
}

export function addTaskToTracker(folder: ScratchPadFolder, title: string): string {
  const added = addTask(folder.readProgressTracker(), title)
  save(folder, added.tracker, 'task-added', added.task.number)
  return taskLine(added.task, 'added')
}

export function startTaskInTracker(folder: ScratchPadFolder, number: number): string {
  const start = startTask(folder.readProgressTracker(), number)
  save(folder, start.tracker, 'task-started', number)
  return startedTaskText(start)
}

export function finishTaskInTracker(folder: ScratchPadFolder, number: number): string {
  const finish = finishTask(folder.readProgressTracker(), number)
  save(folder, finish.tracker, 'task-done', number)
  return finishedTaskText(finish)
}

function save(
  folder: ScratchPadFolder,
  tracker: ProgressTracker,
  kind: EventKind,
  taskNumber: number | undefined,
): void {
  folder.writeProgressTracker(tracker)
  folder.appendEvent(
    nextEvent(folder.readEvents(), {
      time: new Date().toISOString(),
      kind,
      by: 'agent',
      item: taskNumber === undefined ? undefined : `task-${taskNumber}`,
    }),
  )
}
