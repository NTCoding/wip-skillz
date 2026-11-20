import { describe, expect, it } from 'vitest'
import { type ScratchPadEvent } from '../events/scratch-pad-event'
import { momentNickIsQuiet } from './nick-quiet'

const events: ScratchPadEvent[] = [
  { number: 1, time: '2026-03-14T09:30:00.000Z', kind: 'thread-opened', by: 'nick', item: 'c-1' },
  { number: 2, time: '2026-03-14T09:31:00.000Z', kind: 'thread-replied', by: 'agent', item: 'c-1' },
]

describe('momentNickIsQuiet', () => {
  it('returns the time of the last event by Nick plus the quiet time when Nick has done something', () => {
    expect(momentNickIsQuiet(events, 10_000)).toBe(Date.parse('2026-03-14T09:30:10.000Z'))
  })

  it('returns 0 when Nick has not done anything yet', () => {
    expect(momentNickIsQuiet(events.slice(1), 10_000)).toBe(0)
  })
})
