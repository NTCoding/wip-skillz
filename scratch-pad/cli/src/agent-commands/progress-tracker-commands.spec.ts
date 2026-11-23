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
  addSubtaskToTracker,
  addTaskToTracker,
  assignSubtaskInTracker,
  assignTaskInTracker,
  describeSubtaskInTracker,
  describeTaskInTracker,
  finishSubtaskInTracker,
  finishTaskInTracker,
  listTasks,
  moveSubtaskInTracker,
  moveTaskInTracker,
  setGoalOfScratchPad,
  showSubtask,
  showTask,
  startSubtaskInTracker,
  startTaskInTracker,
} from './progress-tracker-commands'
import { TaskAlreadyDoneError } from '../progress-tracker/task-progress'
import {
  exportJobAddress,
  missingLinksText,
  servedLinks,
  unservedLinks,
} from '../item-links/item-links-fixtures'

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
      '[t-1] task 1 added: Write the retry policy',
    )
  })

  it('appends a task-added event that refers to the task', () => {
    const folder = scratchPadWithTwoTasks()

    expect(folder.read((pad) => pad.readEvents()).at(-1)?.item).toBe('t-2')
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
      {
        id: 't-1',
        number: 1,
        title: 'Write the retry policy',
        state: 'to-do',
        description: undefined,
        assignment: undefined,
        subtasks: [],
      },
    ])
  })
})

describe('startTaskInTracker', () => {
  it('prints the started task', () => {
    expect(startTaskInTracker(scratchPadWithTwoTasks(), 2)).toBe(
      '[t-2] task 2 has started: Write the invoice template',
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
        '[t-1] task 1 was done and has started again: Write the retry policy',
        '[t-2] task 2 is to do again: Write the invoice template',
      ].join('\n'),
    )
  })
})

describe('finishTaskInTracker', () => {
  it('prints the finished task and the next task that has started', () => {
    const folder = scratchPadWithTwoTasks()
    startTaskInTracker(folder, 1)

    expect(finishTaskInTracker(folder, 1)).toBe(
      '[t-1] task 1 is done: Write the retry policy\n[t-2] task 2 has started: Write the invoice template',
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
      '1  [t-1]  in progress  Write the retry policy\n2  [t-2]  to do        Write the invoice template',
    )
  })
})

describe('describeTaskInTracker', () => {
  const description = '- The policy is on [the retry limit](retry-limit.md).'

  it('prints the described task and the link to its subsection when the server runs', () => {
    const folder = scratchPadWithTwoTasks()

    expect(describeTaskInTracker(folder, 2, description, servedLinks)).toBe(
      [
        '[t-2] task 2 is described: Write the invoice template',
        `link: ${exportJobAddress}progress-tracker#t-2`,
      ].join('\n'),
    )
  })

  it('saves the description and appends a task-described event that refers to the task', () => {
    const folder = scratchPadWithTwoTasks()

    describeTaskInTracker(folder, 2, description, unservedLinks)

    expect(
      folder.read((pad) => pad.readProgressTracker()).tasks.map((task) => task.description),
    ).toStrictEqual([undefined, description])
    expect(folder.read((pad) => pad.readEvents()).at(-1)).toMatchObject({
      kind: 'task-described',
      item: 't-2',
    })
  })
})

describe('showTask', () => {
  it('prints the task and its description so that the agent can edit the description', () => {
    const folder = scratchPadWithTwoTasks()
    describeTaskInTracker(folder, 1, '- The limit is 5.', unservedLinks)

    expect(showTask(folder, 1, unservedLinks)).toBe(
      [
        '[t-1] task 1 is to do: Write the retry policy',
        'description:',
        '- The limit is 5.',
        missingLinksText,
      ].join('\n'),
    )
  })

  it('prints the link to the task on the progress tracker with its id as the anchor when the server runs', () => {
    expect(showTask(scratchPadWithTwoTasks(), 2, servedLinks).split('\n')[1]).toBe(
      `link: ${exportJobAddress}progress-tracker#t-2`,
    )
  })
})

// Task 1 is Write the retry policy. Task 2 is Write the invoice template, which has the subtasks
// 2.1 Show the tax number (t-3) and 2.2 Show the bank details (t-4).
function scratchPadWithSubtasks() {
  const folder = scratchPadWithTwoTasks()
  addSubtaskToTracker(folder, 2, 'Show the tax number', unservedLinks)
  addSubtaskToTracker(folder, 2, 'Show the bank details', unservedLinks)
  return folder
}

describe('addSubtaskToTracker', () => {
  it('prints the added subtask with its id and its number and then the link to the progress tracker', () => {
    expect(
      addSubtaskToTracker(scratchPadWithTwoTasks(), 2, 'Show the tax number', servedLinks),
    ).toBe(
      [
        '[t-3] subtask 2.1 added: Show the tax number',
        `link: ${exportJobAddress}progress-tracker`,
      ].join('\n'),
    )
  })

  it('prints that the first subtask of the task in progress is in progress', () => {
    const folder = scratchPadWithTwoTasks()
    startTaskInTracker(folder, 2)

    expect(addSubtaskToTracker(folder, 2, 'Show the tax number', unservedLinks)).toBe(
      [
        '[t-3] subtask 2.1 added: Show the tax number',
        '[t-3] subtask 2.1 is in progress, because its task was in progress: Show the tax number',
        missingLinksText,
      ].join('\n'),
    )
  })

  it('appends a task-added event that refers to the subtask', () => {
    expect(
      scratchPadWithSubtasks()
        .read((pad) => pad.readEvents())
        .at(-1),
    ).toMatchObject({
      kind: 'task-added',
      item: 't-4',
    })
  })
})

describe('the commands of a subtask', () => {
  it('prints the started subtask', () => {
    expect(startSubtaskInTracker(scratchPadWithSubtasks(), { task: 2, subtask: 1 })).toBe(
      '[t-3] subtask 2.1 has started: Show the tax number',
    )
  })

  it('prints the finished subtask and the next subtask of the same task that has started', () => {
    const folder = scratchPadWithSubtasks()
    startSubtaskInTracker(folder, { task: 2, subtask: 1 })

    expect(finishSubtaskInTracker(folder, { task: 2, subtask: 1 })).toBe(
      '[t-3] subtask 2.1 is done: Show the tax number\n[t-4] subtask 2.2 has started: Show the bank details',
    )
  })

  it('prints the described subtask and the link to the subtask on the progress tracker', () => {
    const folder = scratchPadWithSubtasks()

    expect(
      describeSubtaskInTracker(folder, { task: 2, subtask: 2 }, '- The IBAN.', servedLinks),
    ).toBe(
      [
        '[t-4] subtask 2.2 is described: Show the bank details',
        `link: ${exportJobAddress}progress-tracker#t-4`,
      ].join('\n'),
    )
  })

  it('prints the subtask and its description', () => {
    const folder = scratchPadWithSubtasks()
    describeSubtaskInTracker(folder, { task: 2, subtask: 2 }, '- The IBAN.', unservedLinks)

    expect(showSubtask(folder, { task: 2, subtask: 2 }, unservedLinks)).toBe(
      [
        '[t-4] subtask 2.2 is to do: Show the bank details',
        'description:',
        '- The IBAN.',
        missingLinksText,
      ].join('\n'),
    )
  })
})

describe('moveTaskInTracker', () => {
  it('prints the old and the new number of the task and then the tasks in their new order', () => {
    expect(moveTaskInTracker(scratchPadWithSubtasks(), 2, { side: 'before', target: 1 })).toBe(
      [
        '[t-2] task 2 is now task 1: Write the invoice template',
        '1    [t-2]  to do  Write the invoice template',
        '1.1  [t-3]  to do  Show the tax number',
        '1.2  [t-4]  to do  Show the bank details',
        '2    [t-1]  to do  Write the retry policy',
      ].join('\n'),
    )
  })

  it('saves the new order and appends a task-moved event that refers to the task', () => {
    const folder = scratchPadWithTwoTasks()

    moveTaskInTracker(folder, 1, { side: 'after', target: 2 })

    expect([
      folder.read((pad) => pad.readProgressTracker().tasks.map((task) => task.id)),
      folder.read((pad) => pad.readEvents().at(-1)?.item),
    ]).toStrictEqual([['t-2', 't-1'], 't-1'])
  })
})

describe('moveSubtaskInTracker', () => {
  it('prints the old and the new number of the subtask', () => {
    const text = moveSubtaskInTracker(
      scratchPadWithSubtasks(),
      { task: 2, subtask: 2 },
      {
        side: 'before',
        target: { task: 2, subtask: 1 },
      },
    )

    expect(text.split('\n')[0]).toBe('[t-4] subtask 2.2 is now subtask 2.1: Show the bank details')
  })
})

describe('the assignments to Nick', () => {
  const migration = { do: 'Run the migration on staging', why: "The agent can't reach staging" }

  it('prints the assigned task and the link to the task on the progress tracker', () => {
    expect(assignTaskInTracker(scratchPadWithTwoTasks(), 2, migration, servedLinks)).toBe(
      [
        '[t-2] task 2 is assigned to Nick: Write the invoice template',
        `link: ${exportJobAddress}progress-tracker#t-2`,
      ].join('\n'),
    )
  })

  it('saves the assignment and appends a task-assigned event that refers to the subtask', () => {
    const folder = scratchPadWithSubtasks()

    assignSubtaskInTracker(folder, { task: 2, subtask: 2 }, migration, unservedLinks)

    expect(
      folder.read((pad) => pad.readProgressTracker().tasks[1]?.subtasks[1]?.assignment),
    ).toStrictEqual({ assignee: 'user', ...migration })
    expect(folder.read((pad) => pad.readEvents()).at(-1)).toMatchObject({
      kind: 'task-assigned',
      item: 't-4',
    })
  })

  it('asks which subtasks Nick has to do after the link when a subtask is added to an assigned task', () => {
    const folder = scratchPadWithTwoTasks()
    assignTaskInTracker(folder, 2, migration, unservedLinks)

    expect(addSubtaskToTracker(folder, 2, 'Run the migration', servedLinks)).toBe(
      [
        '[t-3] subtask 2.1 added: Run the migration',
        `link: ${exportJobAddress}progress-tracker`,
        'Task 2 is assigned to Nick and now has subtasks.',
        'Which subtasks does Nick have to do?',
        'Run "subtask assign <number> --do ... --why ..." for each one.',
        'The current assignment of task 2, which you can reuse:',
        '  do:  Run the migration on staging',
        "  why: The agent can't reach staging",
      ].join('\n'),
    )
  })

  it('removes the saved assignment of the task when one of its subtasks is assigned', () => {
    const folder = scratchPadWithTwoTasks()
    assignTaskInTracker(folder, 2, migration, unservedLinks)
    addSubtaskToTracker(folder, 2, 'Run the migration', unservedLinks)

    expect(assignSubtaskInTracker(folder, { task: 2, subtask: 1 }, migration, unservedLinks)).toBe(
      [
        '[t-3] subtask 2.1 is assigned to Nick: Run the migration',
        "[t-2] task 2 isn't assigned to Nick any more, because subtask 2.1 is assigned to him now: Write the invoice template",
        missingLinksText,
      ].join('\n'),
    )
    expect(folder.read((pad) => pad.readProgressTracker().tasks[1]?.assignment)).toBeUndefined()
  })
})
