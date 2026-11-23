import { describe, expect, it } from 'vitest'
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
      subtasks: [],
    },
    {
      id: 't-2',
      number: 2,
      title: 'Write the invoice template',
      state: 'in-progress',
      description: '- The template shows [the tax number](invoice-template.md#tax-number).',
      subtasks: [
        {
          id: 't-4',
          number: '2.1',
          title: 'Show the tax number',
          state: 'done',
          description: '- A guest without a company sees the word Private.',
        },
        {
          id: 't-3',
          number: '2.2',
          title: 'Show the bank details',
          state: 'to-do',
          description: undefined,
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
})
