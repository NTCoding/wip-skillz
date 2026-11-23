import { afterEach, describe, expect, it } from 'vitest'
import { withChanges } from '../progress-tracker/progress-tracker'
import { trackerWithTasks } from '../progress-tracker/progress-tracker-fixtures'
import {
  exportJobPadName,
  exportJobScratchPad,
  freezeClockAt,
  removeTemporaryHomes,
  temporaryHome,
} from '../scratch-pad-folder/scratch-pad-folder-fixtures'
import { respondToApiRequest, type ApiResponse } from './scratch-pad-api'

const padApi = `/api/scratch-pads/${exportJobPadName}`

freezeClockAt('2026-03-14T09:30:00.000Z')

afterEach(() => {
  removeTemporaryHomes()
})

function post(home: string, path: string, body: unknown): ApiResponse {
  return respondToApiRequest({ home, method: 'POST', path, body: JSON.stringify(body) })
}

// Task 1 is in progress and task 2 is to do. Only task 1 is assigned to Nick.
function homeWithAssignedTask(): string {
  const home = temporaryHome()
  const assignment = { assignee: 'user', do: 'Check the log', why: 'No access' } as const
  exportJobScratchPad(home).change((pad) =>
    pad.writeProgressTracker(
      withChanges(trackerWithTasks(['in-progress', 'to-do']), new Map([['t-1', { assignment }]])),
    ),
  )
  return home
}

describe('respondToApiRequest for the tasks', () => {
  it('marks a task as done when Nick has done it and returns the task', () => {
    const home = homeWithAssignedTask()

    expect(post(home, `${padApi}/tasks/t-1/done`, {})).toMatchObject({
      status: 200,
      body: { task: { id: 't-1', number: 1, state: 'done' } },
    })
  })

  it('returns the task again when Nick marks a task as done that is already done', () => {
    const home = homeWithAssignedTask()
    post(home, `${padApi}/tasks/t-1/done`, {})

    expect(post(home, `${padApi}/tasks/t-1/done`, {})).toMatchObject({
      status: 200,
      body: { task: { id: 't-1', state: 'done' } },
    })
  })

  it('refuses to mark a task as done that isn’t assigned to Nick', () => {
    const home = temporaryHome()
    const folder = exportJobScratchPad(home)
    folder.change((pad) => pad.writeProgressTracker(trackerWithTasks(['in-progress', 'to-do'])))

    expect(() => post(home, `${padApi}/tasks/t-1/done`, {})).toThrow(
      "Task 1 isn't assigned to you so only the agent can mark it as done.",
    )
    expect(folder.read((pad) => pad.readProgressTracker().tasks[0]?.state)).toBe('in-progress')
  })
})
