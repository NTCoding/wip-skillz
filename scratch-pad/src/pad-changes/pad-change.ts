import { type EventKind, type ScratchPadEvent } from '../events/scratch-pad-event'

export type PadChange =
  | { readonly kind: 'page'; readonly page: string }
  | { readonly kind: 'thread'; readonly id: string }
  | { readonly kind: 'decision'; readonly id: string }
  | { readonly kind: 'decision-log' }
  | { readonly kind: 'progress-tracker' }

export type PageVersions = ReadonlyMap<string, string>

const progressTrackerChange: readonly PadChange[] = [{ kind: 'progress-tracker' }]

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
  'decision-answered': decisionChange,
  'decision-logged': () => [{ kind: 'decision-log' }],
  'goal-set': () => progressTrackerChange,
  'task-added': () => progressTrackerChange,
  'task-started': () => progressTrackerChange,
  'task-done': () => progressTrackerChange,
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
