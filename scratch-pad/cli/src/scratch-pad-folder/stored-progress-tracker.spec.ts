import { describe, expect, it } from 'vitest'
import { trackerWithTasks } from '../progress-tracker/progress-tracker-fixtures'
import { assignTask } from '../progress-tracker/task-assignments'
import { BrokenPadDbError } from './pad-db-errors'
import { exportJobPadName, inMemoryPadDb } from './scratch-pad-folder-fixtures'
import { StoredProgressTracker } from './stored-progress-tracker'

const tracker = {
  title: 'Export job',
  goal: 'Ship the export job.',
  tasks: [
    {
      id: 't-1',
      number: 1,
      title: 'Write the retry policy',
      state: 'done',
      description: undefined,
      assignment: undefined,
      subtasks: [],
    },
    {
      id: 't-2',
      number: 2,
      title: 'Write the invoice template',
      state: 'in-progress',
      description: '- The template shows [the tax number](invoice-template.md#tax-number).',
      assignment: undefined,
      subtasks: [
        {
          id: 't-4',
          number: '2.1',
          title: 'Show the tax number',
          state: 'done',
          description: '- A guest without a company sees the word Private.',
          assignment: {
            assignee: 'user',
            do: 'Check the tax number of a guest on staging',
            why: "The agent can't log in to staging",
          },
        },
        {
          id: 't-3',
          number: '2.2',
          title: 'Show the bank details',
          state: 'to-do',
          description: undefined,
          assignment: undefined,
        },
      ],
    },
  ],
} as const

const storedProgressTracker = () => new StoredProgressTracker(inMemoryPadDb(), exportJobPadName)

describe('StoredProgressTracker', () => {
  it('reads back the tasks and their subtasks in their order when the tracker was written before', () => {
    const stored = storedProgressTracker()
    stored.write(tracker)

    expect(stored.read()).toStrictEqual(tracker)
  })

  it('replaces the tasks when the progress tracker is written again', () => {
    const stored = storedProgressTracker()
    stored.write(tracker)
    stored.write({ title: 'Export job', goal: undefined, tasks: [] })

    expect(stored.read()).toStrictEqual({ title: 'Export job', goal: undefined, tasks: [] })
  })

  it('throws BrokenPadDbError when the progress tracker is missing', () => {
    const read = () => storedProgressTracker().read()

    expect(read).toThrow(BrokenPadDbError)
    expect(read).toThrow(
      "pad.db in 2026-03-14-export-job is broken: the table progress_tracker doesn't have any rows.",
    )
  })

  it.each([
    ["an assignee that isn't the user", "'agent', 'Run it', 'It needs SQL'"],
    ['an assignee without the text of what to do', "'user', NULL, 'It needs SQL'"],
    ['an empty text of what to do', "'user', ' ', 'It needs SQL'"],
    ['an empty text of why', "'user', 'Run it', ''"],
    ['a text of what to do that is only a line break', "'user', char(10), 'It needs SQL'"],
    ['a text of why that is only a tab and wide spaces', "'user', 'Run it', char(9, 12288, 65279)"],
    ['the text of why without an assignee', "NULL, NULL, 'It needs SQL'"],
  ])('refuses a task with %s', (_case, assignment) => {
    const insert = () =>
      inMemoryPadDb().exec(
        `INSERT INTO tasks (id, parent_id, position, title, state, assignee, assignment_do,
           assignment_why)
         VALUES ('t-1', NULL, 1, 'Migrate the orders', 'to-do', ${assignment})`,
      )

    expect(insert).toThrow('CHECK constraint failed')
  })

  // The test compares every text of one character, because each of them shows whether pad.db and
  // the domain trim the same character.
  it('fails to insert a text of one character exactly when the domain throws for it', () => {
    const insert = inMemoryPadDb().prepare(
      `INSERT INTO tasks (id, parent_id, position, title, state, assignee, assignment_do,
         assignment_why)
       VALUES (?, NULL, 1, 'Migrate the orders', 'to-do', 'user', ?, 'It needs SQL')`,
    )
    const tasks = trackerWithTasks(['to-do'])
    const texts = Array.from({ length: 0x10000 }, (_, code) => String.fromCharCode(code))

    expect(
      texts.filter((text, index) => fails(() => insert.run(`t-${index + 1}`, text))),
    ).toStrictEqual(
      texts.filter((text) => fails(() => assignTask(tasks, 1, { do: text, why: 'It needs SQL' }))),
    )
  })
})

function fails(run: () => unknown): boolean {
  try {
    run()
    return false
  } catch {
    return true
  }
}
