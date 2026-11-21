import { describe, expect, it } from 'vitest'
import { type ScratchPadEvent } from '../events/scratch-pad-event'
import { changedPages, changesOfEvents } from './pad-change'

const time = '2026-03-14T09:30:00.000Z'

function event(number: number, kind: ScratchPadEvent['kind'], item?: string): ScratchPadEvent {
  return { number, time, kind, by: 'nick', item }
}

describe('changesOfEvents', () => {
  it('returns one thread change per thread when several events change the same thread', () => {
    expect(
      changesOfEvents([
        event(1, 'thread-opened', 'c-1'),
        event(2, 'thread-replied', 'c-1'),
        event(3, 'thread-resolved', 'g-1'),
        event(4, 'note-done', 'i-1'),
      ]),
    ).toStrictEqual([
      { kind: 'thread', id: 'c-1' },
      { kind: 'thread', id: 'g-1' },
      { kind: 'thread', id: 'i-1' },
    ])
  })

  it('returns no changes when the agent has marked a decision as done', () => {
    expect(changesOfEvents([event(1, 'decision-followed', 'd-1')])).toStrictEqual([])
  })

  it('returns the decision and the log of decisions when Nick answers a decision', () => {
    expect(changesOfEvents([event(1, 'decision-answered', 'd-2')])).toStrictEqual([
      { kind: 'decision', id: 'd-2' },
      { kind: 'decision-log' },
    ])
  })

  it('returns only the log of decisions when an answer or a logged decision has no id', () => {
    expect(
      changesOfEvents([event(1, 'decision-answered'), event(2, 'decision-logged')]),
    ).toStrictEqual([{ kind: 'decision-log' }])
  })

  it('returns one progress tracker change when the goal and the tasks change', () => {
    expect(
      changesOfEvents([
        event(1, 'goal-set'),
        event(2, 'task-added', 'task-1'),
        event(3, 'task-started', 'task-1'),
        event(4, 'task-done', 'task-1'),
      ]),
    ).toStrictEqual([{ kind: 'progress-tracker' }])
  })

  it('returns nothing when the event creates the scratch pad or opens a thread without an id', () => {
    expect(
      changesOfEvents([event(1, 'scratch-pad-created'), event(2, 'thread-opened')]),
    ).toStrictEqual([])
  })
})

describe('changedPages', () => {
  it('returns the added, changed and removed pages in alphabetical order when the versions differ', () => {
    const before = new Map([
      ['pages/index.md', '1'],
      ['pages/queue.md', '1'],
      ['pages/retry.md', '1'],
    ])
    const after = new Map([
      ['pages/index.md', '1'],
      ['pages/retry.md', '2'],
      ['pages/invoice.md', '1'],
    ])

    expect(changedPages(before, after)).toStrictEqual([
      { kind: 'page', page: 'pages/invoice.md' },
      { kind: 'page', page: 'pages/queue.md' },
      { kind: 'page', page: 'pages/retry.md' },
    ])
  })
})
