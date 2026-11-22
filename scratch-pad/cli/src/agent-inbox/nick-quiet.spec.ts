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
  it('ignores the events of the outbox, because the agent never sees an item in the outbox', () => {
    const outboxEvents: ScratchPadEvent[] = [
      ...events,
      {
        number: 3,
        time: '2026-03-14T09:32:00.000Z',
        kind: 'item-queued',
        by: 'nick',
        item: undefined,
      },
      {
        number: 4,
        time: '2026-03-14T09:33:00.000Z',
        kind: 'queued-item-edited',
        by: 'nick',
        item: undefined,
      },
      {
        number: 5,
        time: '2026-03-14T09:34:00.000Z',
        kind: 'queued-item-removed',
        by: 'nick',
        item: undefined,
      },
    ]

    expect(momentNickIsQuiet(outboxEvents, 10_000)).toBe(Date.parse('2026-03-14T09:30:10.000Z'))
  })

  it('counts the send of the outbox as something that Nick has done', () => {
    const sent: ScratchPadEvent[] = [
      ...events,
      {
        number: 3,
        time: '2026-03-14T09:35:00.000Z',
        kind: 'outbox-sent',
        by: 'nick',
        item: undefined,
      },
    ]

    expect(momentNickIsQuiet(sent, 10_000)).toBe(Date.parse('2026-03-14T09:35:10.000Z'))
  })

  it("ignores the read marks, because the agent doesn't see what Nick has read", () => {
    const marked: ScratchPadEvent[] = [
      ...events,
      ...(['page-read', 'page-unread', 'section-read'] as const).map((kind, index) => ({
        number: index + 3,
        time: `2026-03-14T09:3${index + 2}:00.000Z`,
        kind,
        by: 'nick' as const,
        item: undefined,
      })),
    ]

    expect(momentNickIsQuiet(marked, 10_000)).toBe(Date.parse('2026-03-14T09:30:10.000Z'))
  })
})
