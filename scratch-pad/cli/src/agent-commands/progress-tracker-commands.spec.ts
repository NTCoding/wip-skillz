import { afterEach, describe, expect, it } from 'vitest'
import { PadDbFailureError } from '../scratch-pad-folder/pad-db-errors'
import {
  acceptNewEvents,
  exportJobScratchPad,
  freezeClockAt,
  refuseNewEvents,
  removeTemporaryHomes,
  temporaryHome,
} from '../scratch-pad-folder/scratch-pad-folder-fixtures'
import {
  addTaskToTracker,
  finishTaskInTracker,
  listTasks,
  setGoalOfScratchPad,
  startTaskInTracker,
} from './progress-tracker-commands'
import { TaskAlreadyDoneError } from '../progress-tracker/progress-tracker'

const time = '2026-03-14T09:30:00.000Z'

freezeClockAt(time)

afterEach(() => {
  removeTemporaryHomes()
})

function scratchPadWithTwoTasks() {
  const folder = exportJobScratchPad(temporaryHome())
  addTaskToTracker(folder, 'Write the retry policy')
  addTaskToTracker(folder, 'Write the invoice template')
  return folder
}

describe('setGoalOfScratchPad', () => {
  it('prints the goal', () => {
    expect(setGoalOfScratchPad(exportJobScratchPad(temporaryHome()), 'Ship the export job.')).toBe(
      'goal: Ship the export job.',
    )
  })

  it('saves the goal', () => {
    const folder = exportJobScratchPad(temporaryHome())

    setGoalOfScratchPad(folder, 'Ship the export job.')

    expect(folder.read((pad) => pad.readProgressTracker()).goal).toBe('Ship the export job.')
  })

  it('appends a goal-set event without an item', () => {
    const folder = exportJobScratchPad(temporaryHome())

    setGoalOfScratchPad(folder, 'Ship the export job.')

    expect(folder.read((pad) => pad.readEvents())).toStrictEqual([
      { number: 1, time, kind: 'goal-set', by: 'agent', item: undefined },
    ])
  })
})

describe('addTaskToTracker', () => {
  it('prints the added task', () => {
    expect(addTaskToTracker(exportJobScratchPad(temporaryHome()), 'Write the retry policy')).toBe(
      'task 1 added: Write the retry policy',
    )
  })

  it('appends a task-added event that refers to the task', () => {
    const folder = scratchPadWithTwoTasks()

    expect(folder.read((pad) => pad.readEvents()).at(-1)?.item).toBe('task-2')
  })

  it('saves no task when the event of the task cannot be saved', () => {
    const folder = exportJobScratchPad(temporaryHome())
    refuseNewEvents(folder)

    expect(() => addTaskToTracker(folder, 'Write the retry policy')).toThrow(PadDbFailureError)
    expect(folder.read((pad) => pad.readProgressTracker().tasks)).toStrictEqual([])
  })

  it('adds the task once when the command is run again after it failed', () => {
    const folder = exportJobScratchPad(temporaryHome())
    refuseNewEvents(folder)
    expect(() => addTaskToTracker(folder, 'Write the retry policy')).toThrow(
      'pad.db in 2026-03-14-export-job failed: the disk is full. Nothing was saved. Tell Nick.',
    )
    acceptNewEvents(folder)

    addTaskToTracker(folder, 'Write the retry policy')

    expect(folder.read((pad) => pad.readProgressTracker().tasks)).toStrictEqual([
      { number: 1, title: 'Write the retry policy', state: 'to-do' },
    ])
  })
})

describe('startTaskInTracker', () => {
  it('prints the started task', () => {
    expect(startTaskInTracker(scratchPadWithTwoTasks(), 2)).toBe(
      'task 2 has started: Write the invoice template',
    )
  })

  it('saves the started task', () => {
    const folder = scratchPadWithTwoTasks()

    startTaskInTracker(folder, 2)

    expect(
      folder.read((pad) => pad.readProgressTracker()).tasks.map((task) => task.state),
    ).toStrictEqual(['to-do', 'in-progress'])
  })

  it('prints that the task was done when a done task is started again', () => {
    const folder = scratchPadWithTwoTasks()
    finishTaskInTracker(folder, 1)

    expect(startTaskInTracker(folder, 1)).toBe(
      [
        'task 1 was done and has started again: Write the retry policy',
        'task 2 is to do again: Write the invoice template',
      ].join('\n'),
    )
  })
})

describe('finishTaskInTracker', () => {
  it('prints the finished task and the next task that has started', () => {
    const folder = scratchPadWithTwoTasks()
    startTaskInTracker(folder, 1)

    expect(finishTaskInTracker(folder, 1)).toBe(
      'task 1 is done: Write the retry policy\ntask 2 has started: Write the invoice template',
    )
  })

  it('appends no event when the task is already done', () => {
    const folder = scratchPadWithTwoTasks()
    finishTaskInTracker(folder, 1)
    const events = folder.read((pad) => pad.readEvents())

    expect(() => finishTaskInTracker(folder, 1)).toThrow(TaskAlreadyDoneError)
    expect(folder.read((pad) => pad.readEvents())).toStrictEqual(events)
  })

  it('saves both changes to the progress tracker', () => {
    const folder = scratchPadWithTwoTasks()
    startTaskInTracker(folder, 1)

    finishTaskInTracker(folder, 1)

    expect(
      folder.read((pad) => pad.readProgressTracker()).tasks.map((task) => task.state),
    ).toStrictEqual(['done', 'in-progress'])
  })
})

describe('listTasks', () => {
  it('lists every task with its state when tasks were added and started', () => {
    const folder = scratchPadWithTwoTasks()
    startTaskInTracker(folder, 1)

    expect(listTasks(folder)).toBe(
      '1  in progress  Write the retry policy\n2  to do        Write the invoice template',
    )
  })
})
