import { describe, expect, it } from 'vitest'
import { exportJobPadName, inMemoryPadDb } from './scratch-pad-folder-fixtures'
import { StoredEvents } from './stored-events'

const time = '2026-03-14T09:30:00.000Z'
const goalSet = { time, kind: 'goal-set', by: 'agent', item: undefined } as const
const threadOpened = { time, kind: 'thread-opened', by: 'nick', item: 'c-1' } as const

describe('StoredEvents', () => {
  it('reads back the events in their order when they were appended before', () => {
    const stored = new StoredEvents(inMemoryPadDb(), exportJobPadName)
    stored.append(goalSet)
    stored.append(threadOpened)

    expect(stored.read()).toStrictEqual([
      { number: 1, ...goalSet },
      { number: 2, ...threadOpened },
    ])
  })

  it('returns the number that pad.db gave the event when an event is appended', () => {
    const stored = new StoredEvents(inMemoryPadDb(), exportJobPadName)
    stored.append(goalSet)

    expect(stored.append(threadOpened)).toStrictEqual({ number: 2, ...threadOpened })
  })

  it('never gives a number twice even when the events were deleted', () => {
    const db = inMemoryPadDb()
    const stored = new StoredEvents(db, exportJobPadName)
    stored.append(goalSet)
    stored.append(goalSet)
    db.exec('DELETE FROM events')

    expect(stored.append(threadOpened)).toStrictEqual({ number: 3, ...threadOpened })
  })
})
