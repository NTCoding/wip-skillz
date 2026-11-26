import { nextItemId } from '../items/item-id'
import {
  itemNameFirst,
  itemWithId,
  type ProgressTracker,
  type TrackerItem,
} from '../progress-tracker/progress-tracker'
import { ScratchPadError } from '../scratch-pad-error'
import { openTaskThread, type TaskThread, type Thread } from './thread'

// The thread of a task is shown on the row of the task on the progress tracker. A task that is
// assigned to Nick has a speech bubble on its row. So does a task that already has a thread.
export class UnassignedTaskThreadError extends ScratchPadError {
  constructor(item: TrackerItem) {
    super(
      `${itemNameFirst(item)} isn't assigned to Nick so a thread can't be started on it. A thread can only be started on a task or a subtask that's assigned to Nick.`,
    )
  }
}

export class TaskThreadExistsError extends ScratchPadError {
  constructor(item: TrackerItem, id: string) {
    super(`${itemNameFirst(item)} already has the thread ${id}. Reply to ${id} instead.`)
  }
}

interface NewMessageOnTask {
  readonly task: string
  readonly text: string
  readonly time: string
}

function taskThreadOf(threads: readonly Thread[], task: string): TaskThread | undefined {
  return threads.find((thread): thread is TaskThread => thread.task === task)
}

// A task has one thread at most. Nick reopens a resolved thread with a reply rather than a new
// thread.
export function startTaskThread(
  threads: readonly Thread[],
  tracker: ProgressTracker,
  message: NewMessageOnTask,
): TaskThread {
  const item = itemWithId(tracker, message.task)
  if (item.assignment === undefined) {
    throw new UnassignedTaskThreadError(item)
  }
  const existing = taskThreadOf(threads, item.id)
  if (existing !== undefined) {
    throw new TaskThreadExistsError(item, existing.id)
  }
  return openTaskThread({
    ...message,
    id: nextItemId(
      'comment',
      threads.map((thread) => thread.id),
    ),
  })
}
