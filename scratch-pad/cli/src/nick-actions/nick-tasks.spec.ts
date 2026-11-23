import { afterEach, describe, expect, it } from 'vitest'
import {
  withChanges,
  type Assignment,
  type ProgressTracker,
} from '../progress-tracker/progress-tracker'
import {
  trackerWithSubtasks,
  trackerWithTasks,
} from '../progress-tracker/progress-tracker-fixtures'
import {
  exportJobScratchPad,
  freezeClockAt,
  removeTemporaryHomes,
  temporaryHome,
} from '../scratch-pad-folder/scratch-pad-folder-fixtures'
import { type ScratchPadFolder } from '../scratch-pad-folder/scratch-pad-folder'
import { nickFinishesTask, SplitTaskDoneError, UnassignedTaskDoneError } from './nick-actions'

const time = '2026-03-14T09:30:00.000Z'

freezeClockAt(time)

afterEach(() => {
  removeTemporaryHomes()
})

const assignment: Assignment = {
  assignee: 'user',
  do: 'Check the log of the export job',
  why: "The agent can't read the log",
}

// The tracker with the tasks and the subtasks of the ids assigned to Nick
function withAssigned(tracker: ProgressTracker, ids: readonly string[]): ProgressTracker {
  return withChanges(tracker, new Map(ids.map((id) => [id, { assignment }])))
}

function padWith(tracker: ProgressTracker): ScratchPadFolder {
  const folder = exportJobScratchPad(temporaryHome())
  folder.change((pad) => pad.writeProgressTracker(tracker))
  return folder
}

function eventsOf(folder: ScratchPadFolder) {
  return folder.read((pad) => pad.readEvents()).map((event) => [event.kind, event.by, event.item])
}

describe('nickFinishesTask', () => {
  it('marks a subtask as done and starts the next subtask of its task', () => {
    const folder = padWith(withAssigned(trackerWithSubtasks(['in-progress', 'to-do']), ['t-4']))

    nickFinishesTask(folder, 't-4')

    expect(
      folder
        .read((pad) => pad.readProgressTracker())
        .tasks[1]?.subtasks.map((subtask) => [subtask.id, subtask.state]),
    ).toStrictEqual([
      ['t-4', 'done'],
      ['t-5', 'in-progress'],
    ])
  })

  it('marks a task without subtasks as done and returns the task', () => {
    const folder = padWith(withAssigned(trackerWithTasks(['in-progress', 'to-do']), ['t-1']))

    expect(nickFinishesTask(folder, 't-1')).toMatchObject({ id: 't-1', state: 'done' })
  })

  it('records that Nick has done the task', () => {
    const folder = padWith(withAssigned(trackerWithTasks(['in-progress']), ['t-1']))

    nickFinishesTask(folder, 't-1')

    expect(folder.read((pad) => pad.readEvents()).at(-1)).toMatchObject({
      time,
      kind: 'task-done',
      by: 'nick',
      item: 't-1',
    })
  })

  it('records the start of the next task straight after the task that Nick has done', () => {
    const folder = padWith(withAssigned(trackerWithSubtasks(['in-progress', 'to-do']), ['t-4']))

    nickFinishesTask(folder, 't-4')

    expect(eventsOf(folder).slice(-2)).toStrictEqual([
      ['task-done', 'nick', 't-4'],
      ['task-started', 'nick', 't-5'],
    ])
  })

  it('returns a task that is already done without recording it again', () => {
    const folder = padWith(withAssigned(trackerWithTasks(['in-progress', 'to-do']), ['t-1']))
    nickFinishesTask(folder, 't-1')
    const events = eventsOf(folder)

    expect([nickFinishesTask(folder, 't-1'), eventsOf(folder)]).toMatchObject([
      { id: 't-1', state: 'done' },
      events,
    ])
  })

  it('refuses a task that isn’t assigned to Nick and leaves the tracker as it was', () => {
    const tracker = trackerWithSubtasks(['in-progress', 'to-do'])
    const folder = padWith(tracker)

    expect(() => nickFinishesTask(folder, 't-4')).toThrow(UnassignedTaskDoneError)
    expect([folder.read((pad) => pad.readProgressTracker()), eventsOf(folder)]).toStrictEqual([
      tracker,
      [],
    ])
  })

  it('tells Nick that only the agent can mark a task as done that isn’t assigned to him', () => {
    const folder = padWith(trackerWithTasks(['in-progress']))

    expect(() => nickFinishesTask(folder, 't-1')).toThrow(
      "Task 1 isn't assigned to you so only the agent can mark it as done.",
    )
  })

  it('tells Nick that the agent has split a task into subtasks since the Inbox showed its button', () => {
    const folder = padWith(withAssigned(trackerWithSubtasks(['to-do', 'to-do']), ['t-2']))

    expect(() => nickFinishesTask(folder, 't-2')).toThrow(SplitTaskDoneError)
    expect(() => nickFinishesTask(folder, 't-2')).toThrow(
      'The agent has split task 2 into subtasks and will tell you which of them are yours.',
    )
  })
})
