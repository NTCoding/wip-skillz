import { describe, expect, it } from 'vitest'
import { BrokenPadDbError } from './pad-db-errors'
import { exportJobPadName, inMemoryPadDb } from './scratch-pad-folder-fixtures'
import { StoredProgressTracker } from './stored-progress-tracker'

const tracker = {
  title: 'Export job',
  goal: 'Ship the export job.',
  tasks: [
    { number: 1, title: 'Write the retry policy', state: 'done' },
    { number: 2, title: 'Write the invoice template', state: 'in-progress' },
  ],
} as const

const storedProgressTracker = () => new StoredProgressTracker(inMemoryPadDb(), exportJobPadName)

describe('StoredProgressTracker', () => {
  it('reads back the progress tracker when it was written before', () => {
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
