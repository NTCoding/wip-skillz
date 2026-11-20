import { type Author } from '../threads/thread'

export const eventKinds = [
  'scratch-pad-created',
  'thread-opened',
  'thread-replied',
  'thread-resolved',
  'note-done',
  'decision-answered',
  'decision-logged',
  'goal-set',
  'task-added',
  'task-started',
  'task-done',
] as const
export type EventKind = (typeof eventKinds)[number]

export interface ScratchPadEvent {
  readonly number: number
  readonly time: string
  readonly kind: EventKind
  readonly by: Author
  readonly item: string | undefined
}

export type NewEvent = Omit<ScratchPadEvent, 'number'>

export function nextEvent(events: readonly ScratchPadEvent[], event: NewEvent): ScratchPadEvent {
  return { number: latestEventNumber(events) + 1, ...event }
}

export function latestEventNumber(events: readonly ScratchPadEvent[]): number {
  return events.at(-1)?.number ?? 0
}

export function lastEventNumberPerItem(
  events: readonly ScratchPadEvent[],
): ReadonlyMap<string, number> {
  return new Map(
    events.flatMap((event): Array<[string, number]> =>
      event.item === undefined ? [] : [[event.item, event.number]],
    ),
  )
}
