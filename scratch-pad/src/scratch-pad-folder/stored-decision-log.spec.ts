import { describe, expect, it } from 'vitest'
import { exportJobPadName, inMemoryPadDb } from './scratch-pad-folder-fixtures'
import { StoredDecisionLog } from './stored-decision-log'

const time = '2026-03-14T09:30:00.000Z'

const storedDecisionLog = () => new StoredDecisionLog(inMemoryPadDb(), exportJobPadName)

describe('StoredDecisionLog', () => {
  it('reads back the log in the order of the numbers when the entries were saved in another order', () => {
    const stored = storedDecisionLog()
    const log = [
      { number: 1, time, source: 'chat', text: 'Keep 5 retries.', decision: undefined },
      { number: 2, time, source: 'page', text: 'Show the tax number.', decision: 'd-1' },
    ] as const
    stored.save(log[1])
    stored.save(log[0])

    expect(stored.read()).toStrictEqual(log)
  })

  it('replaces the log entry when an entry with the same number is saved', () => {
    const stored = storedDecisionLog()
    const entry = { number: 1, time, source: 'page', text: 'Keep 5.', decision: 'd-1' } as const
    stored.save(entry)
    stored.save({ ...entry, text: 'Make it 7.' })

    expect(stored.read()).toStrictEqual([{ ...entry, text: 'Make it 7.' }])
  })
})
