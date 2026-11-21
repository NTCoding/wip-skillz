import { describe, expect, it } from 'vitest'
import {
  lastEventNumberPerItem,
  latestEventNumber,
  type ScratchPadEvent,
} from './scratch-pad-event'

const time = '2026-03-14T09:30:00.000Z'

const events: ScratchPadEvent[] = [
  { number: 1, time, kind: 'scratch-pad-created', by: 'agent', item: undefined },
  { number: 2, time, kind: 'thread-opened', by: 'nick', item: 'c-1' },
  { number: 3, time, kind: 'thread-opened', by: 'nick', item: 'g-1' },
  { number: 4, time, kind: 'thread-replied', by: 'agent', item: 'c-1' },
]

describe('latestEventNumber', () => {
  it('returns 0 when there are no events', () => {
    expect(latestEventNumber([])).toBe(0)
  })
})

describe('lastEventNumberPerItem', () => {
  it('returns the number of the last event of each item', () => {
    expect([...lastEventNumberPerItem(events)]).toStrictEqual([
      ['c-1', 4],
      ['g-1', 3],
    ])
  })
})
