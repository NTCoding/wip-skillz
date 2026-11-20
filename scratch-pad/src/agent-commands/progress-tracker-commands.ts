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
  return folder.change((pad) => {
    const added = addTask(pad.readProgressTracker(), title)
    save(pad, added.tracker, 'task-added', added.task.number)
    return taskLine(added.task, 'added')
  })
}

export function startTaskInTracker(folder: ScratchPadFolder, number: number): string {
  return folder.change((pad) => {
    const start = startTask(pad.readProgressTracker(), number)
    save(pad, start.tracker, 'task-started', number)
    return startedTaskText(start)
  })
}

export function finishTaskInTracker(folder: ScratchPadFolder, number: number): string {
  return folder.change((pad) => {
    const finish = finishTask(pad.readProgressTracker(), number)
    save(pad, finish.tracker, 'task-done', number)
    return finishedTaskText(finish)
  })
}

function save(
  pad: PadDb,
  tracker: ProgressTracker,
  kind: EventKind,
  taskNumber: number | undefined,
): void {
  pad.writeProgressTracker(tracker)
  pad.appendEvent({
    time: new Date().toISOString(),
    kind,
    by: 'agent',
    item: taskNumber === undefined ? undefined : `task-${taskNumber}`,
  })
}
