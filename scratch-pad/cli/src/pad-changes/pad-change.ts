import { type EventKind, type ScratchPadEvent } from '../events/scratch-pad-event'

export type PadChange =
  | { readonly kind: 'page'; readonly page: string }
  | { readonly kind: 'thread'; readonly id: string }
  | { readonly kind: 'decision'; readonly id: string }
  | { readonly kind: 'decision-log' }
  | { readonly kind: 'improvements' }
  | { readonly kind: 'outbox' }
  | { readonly kind: 'read-marks' }
  | { readonly kind: 'progress-tracker' }

export type PageVersions = ReadonlyMap<string, string>

const progressTrackerChange: readonly PadChange[] = [{ kind: 'progress-tracker' }]
const outboxChange: readonly PadChange[] = [{ kind: 'outbox' }]
const readMarksChange: readonly PadChange[] = [{ kind: 'read-marks' }]

function threadChange(item: string | undefined): readonly PadChange[] {
  return item === undefined ? [] : [{ kind: 'thread', id: item }]
}

function decisionChange(item: string | undefined): readonly PadChange[] {
  const log: PadChange = { kind: 'decision-log' }
  return item === undefined ? [log] : [{ kind: 'decision', id: item }, log]
}

const changesOfKind: Readonly<
  Record<EventKind, (item: string | undefined) => readonly PadChange[]>
> = {
  'scratch-pad-created': () => [],
  'thread-opened': threadChange,
  'thread-replied': threadChange,
  'thread-resolved': threadChange,
  'note-done': threadChange,
  // The event is recorded while the decisions of the Inbox are read. The browser reads them again
  // after every change to a page, which is how a new decision appears on a page. That's why the
  // event doesn't need a change of its own.
  'decision-asked': () => [],
  'decision-answered': decisionChange,
  'decision-followed': () => [],
  'decision-logged': () => [{ kind: 'decision-log' }],
  'improvement-logged': () => [{ kind: 'improvements' }],
  'improvement-edited': () => [{ kind: 'improvements' }],
  'improvement-deleted': () => [{ kind: 'improvements' }],
  'item-queued': () => outboxChange,
  'queued-item-edited': () => outboxChange,
  'queued-item-removed': () => outboxChange,
  'outbox-sent': () => outboxChange,
  'page-read': () => readMarksChange,
  'page-unread': () => readMarksChange,
  'section-read': () => readMarksChange,
  'goal-set': () => progressTrackerChange,
  'task-added': () => progressTrackerChange,
  'task-described': () => progressTrackerChange,
  'task-started': () => progressTrackerChange,
  'task-done': () => progressTrackerChange,
  'task-moved': () => progressTrackerChange,
}

export function changesOfEvents(events: readonly ScratchPadEvent[]): PadChange[] {
  const changes = events.flatMap((event) => changesOfKind[event.kind](event.item))
  return [...new Map(changes.map((change) => [JSON.stringify(change), change])).values()]
}

export function changedPages(before: PageVersions, after: PageVersions): PadChange[] {
  return [...new Set([...before.keys(), ...after.keys()])]
    .filter((page) => before.get(page) !== after.get(page))
    .toSorted((first, second) => first.localeCompare(second))
    .map((page) => ({ kind: 'page', page }))
}
