import { type DecisionAnswer } from '../decisions/decision-answer'
import {
  lastEventNumberPerItem,
  latestEventNumber,
  type ScratchPadEvent,
} from '../events/scratch-pad-event'
import { type ItemType } from '../items/item-id'
import {
  trackerItems,
  type ProgressTracker,
  type TrackerItem,
} from '../progress-tracker/progress-tracker'
import { type Thread } from '../threads/thread'

// A task is a task or a subtask that was assigned to Nick, which Nick has marked as done in the
// browser. The started task is the next task, which the server started when Nick's task was done.
export type AgentInboxItem =
  | { readonly kind: 'thread'; readonly thread: Thread }
  | { readonly kind: 'decision'; readonly decision: DecisionAnswer }
  | {
      readonly kind: 'task'
      readonly task: TrackerItem
      readonly started: TrackerItem | undefined
    }

export type LastPrintedEvents = Readonly<Record<ItemType, number>>

// A task that Nick has done is counted on its own, like "1 decision, 1 task", but it's printed with
// the decisions.
export interface ItemCount {
  readonly type: ItemType | 'task'
  readonly count: number
}

export interface AgentInboxRequest {
  readonly threads: readonly Thread[]
  readonly decisions: readonly DecisionAnswer[]
  readonly tracker: ProgressTracker
  readonly events: readonly ScratchPadEvent[]
  readonly lastPrinted: LastPrintedEvents
  readonly types: readonly ItemType[]
  readonly includeSeen: boolean
}

export interface AgentInboxSelection {
  readonly printed: readonly AgentInboxItem[]
  readonly seenBefore: number
  readonly sideNotes: readonly ItemCount[]
  readonly otherItems: readonly ItemCount[]
  readonly lastPrinted: LastPrintedEvents
}

export const mainAgentTypes: readonly ItemType[] = ['comment', 'decision']
const countedTypes: ReadonlyArray<ItemCount['type']> = [
  'comment',
  'decision',
  'task',
  'grammar',
  'improvement',
]
const sideNoteTypes: readonly ItemType[] = ['grammar', 'improvement']

export const nothingPrinted: LastPrintedEvents = {
  comment: 0,
  decision: 0,
  grammar: 0,
  improvement: 0,
}

// A task that Nick has done doesn't have an item type of its own. It's printed with the decisions,
// because like the answer to a decision it's something that Nick has done for the agent.
function itemType(item: AgentInboxItem): ItemType {
  return item.kind === 'thread' ? item.thread.type : 'decision'
}

export function itemId(item: AgentInboxItem): string {
  if (item.kind === 'thread') {
    return item.thread.id
  }
  return item.kind === 'decision' ? item.decision.id : item.task.id
}

export function itemsWaitingForAgent(
  threads: readonly Thread[],
  decisions: readonly DecisionAnswer[],
): AgentInboxItem[] {
  return [
    ...threads
      .filter((thread) => thread.waitsFor === 'agent')
      .map((thread): AgentInboxItem => ({ kind: 'thread', thread })),
    ...decisions
      .filter((decision) => decision.outcome === undefined)
      .map((decision): AgentInboxItem => ({ kind: 'decision', decision })),
  ]
}

export function countsByType(items: readonly AgentInboxItem[]): ItemCount[] {
  return countedTypes
    .map((type) => ({ type, count: items.filter((item) => countedType(item) === type).length }))
    .filter((entry) => entry.count > 0)
}

function countedType(item: AgentInboxItem): ItemCount['type'] {
  return item.kind === 'task' ? 'task' : itemType(item)
}

// The tasks and the subtasks that Nick has marked as done since the decisions were last printed. Each
// one is printed once. A task that the agent has started again since then isn't printed.
export function tasksDoneByNick(
  request: Pick<AgentInboxRequest, 'tracker' | 'events' | 'lastPrinted'>,
): AgentInboxItem[] {
  const doneEvents = new Map(
    request.events
      .filter(
        (event) =>
          event.kind === 'task-done' &&
          event.by === 'nick' &&
          event.number > request.lastPrinted.decision,
      )
      .map((event) => [event.item, event]),
  )
  const items = trackerItems(request.tracker)
  return items.flatMap((task): AgentInboxItem[] => {
    const done = doneEvents.get(task.id)
    return done === undefined || task.state !== 'done'
      ? []
      : [{ kind: 'task', task, started: startedAfter(done, request.events, items) }]
  })
}

// The server records the start of the next task straight after the task that Nick has done.
function startedAfter(
  done: ScratchPadEvent,
  events: readonly ScratchPadEvent[],
  items: readonly TrackerItem[],
): TrackerItem | undefined {
  const next = events.find((event) => event.number === done.number + 1)
  return next?.kind === 'task-started' && next.by === 'nick'
    ? items.find((item) => item.id === next.item)
    : undefined
}

export function selectAgentInbox(request: AgentInboxRequest): AgentInboxSelection {
  const lastEvents = lastEventNumberPerItem(request.events)
  const latest = latestEventNumber(request.events)
  const lastEventOf = (item: AgentInboxItem): number =>
    lastEvents.get(itemId(item)) ?? Number.MAX_SAFE_INTEGER
  const waiting = itemsWaitingForAgent(request.threads, request.decisions)
  const tasksDone = tasksDoneByNick(request)
  const ofRequestedTypes = waiting.filter((item) => request.types.includes(itemType(item)))
  const printedItems = request.includeSeen
    ? ofRequestedTypes
    : ofRequestedTypes.filter((item) => lastEventOf(item) > request.lastPrinted[itemType(item)])
  const printed = [...printedItems, ...(request.types.includes('decision') ? tasksDone : [])]
  const lastPrintedFor = (type: ItemType): number =>
    request.types.includes(type) ? latest : request.lastPrinted[type]
  const notRequested = (types: readonly ItemType[]): ItemCount[] =>
    countsByType(
      [...waiting, ...tasksDone].filter(
        (item) => types.includes(itemType(item)) && !request.types.includes(itemType(item)),
      ),
    )
  return {
    printed: printed.toSorted((first, second) => lastEventOf(first) - lastEventOf(second)),
    seenBefore: ofRequestedTypes.length - printedItems.length,
    sideNotes: notRequested(sideNoteTypes),
    otherItems: notRequested(mainAgentTypes),
    lastPrinted: {
      comment: lastPrintedFor('comment'),
      decision: lastPrintedFor('decision'),
      grammar: lastPrintedFor('grammar'),
      improvement: lastPrintedFor('improvement'),
    },
  }
}
