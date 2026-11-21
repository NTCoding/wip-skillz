import { countedNoun } from '../counted-noun'
import {
  currentTask,
  type FinishedTask,
  type ProgressTracker,
  type StartedTask,
  type Task,
  type TaskState,
} from './progress-tracker'

const stateTexts: Readonly<Record<TaskState, string>> = {
  'to-do': 'to do',
  'in-progress': 'in progress',
  done: 'done',
}

export function taskLine(task: Task, change: string): string {
  return `task ${task.number} ${change}: ${task.title}`
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

export function taskListText(tracker: ProgressTracker): string {
  if (tracker.tasks.length === 0) {
    return "there aren't any tasks yet"
  }
  const numberWidth = String(tracker.tasks.length).length
  const stateWidth = Math.max(...tracker.tasks.map((task) => stateTexts[task.state].length))
  return tracker.tasks
    .map((task) =>
      [
        String(task.number).padStart(numberWidth),
        stateTexts[task.state].padEnd(stateWidth),
        task.title,
      ].join('  '),
    )
    .join('\n')
}

export function currentTaskLine(tracker: ProgressTracker): string {
  const task = currentTask(tracker)
  if (task !== undefined) {
    return `task ${task.number} of ${tracker.tasks.length}: ${task.title}`
  }
  if (tracker.tasks.length === 0) {
    return 'no tasks yet'
  }
  const done = tracker.tasks.filter((candidate) => candidate.state === 'done').length
  return `no task in progress · ${done} of ${countedNoun(tracker.tasks.length, 'task')} done`
}

function nextTaskLine(finish: FinishedTask): string {
  if (finish.started !== undefined) {
    return taskLine(finish.started, 'has started')
  }
  const current = currentTask(finish.tracker)
  return current === undefined ? 'no task is left to do' : taskLine(current, 'is still in progress')
}
