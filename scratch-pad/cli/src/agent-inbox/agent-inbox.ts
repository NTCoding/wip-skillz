import { type DecisionAnswer } from '../decisions/decision-answer'
import {
  lastEventNumberPerItem,
  latestEventNumber,
  type ScratchPadEvent,
} from '../events/scratch-pad-event'
import { itemTypes, type ItemType } from '../items/item-id'
import { type Thread } from '../threads/thread'

export type AgentInboxItem =
  | { readonly kind: 'thread'; readonly thread: Thread }
  | { readonly kind: 'decision'; readonly decision: DecisionAnswer }

export type LastPrintedEvents = Readonly<Record<ItemType, number>>

export interface ItemCount {
  readonly type: ItemType
  readonly count: number
}

export interface AgentInboxRequest {
  readonly threads: readonly Thread[]
  readonly decisions: readonly DecisionAnswer[]
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
const sideNoteTypes: readonly ItemType[] = ['grammar', 'improvement']

export const nothingPrinted: LastPrintedEvents = {
  comment: 0,
  decision: 0,
  grammar: 0,
  improvement: 0,
}

function itemType(item: AgentInboxItem): ItemType {
  return item.kind === 'thread' ? item.thread.type : 'decision'
}

export function itemId(item: AgentInboxItem): string {
  return item.kind === 'thread' ? item.thread.id : item.decision.id
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
  return itemTypes
    .map((type) => ({ type, count: items.filter((item) => itemType(item) === type).length }))
    .filter((entry) => entry.count > 0)
}

export function selectAgentInbox(request: AgentInboxRequest): AgentInboxSelection {
  const lastEvents = lastEventNumberPerItem(request.events)
  const latest = latestEventNumber(request.events)
  const lastEventOf = (item: AgentInboxItem): number =>
    lastEvents.get(itemId(item)) ?? Number.MAX_SAFE_INTEGER
  const waiting = itemsWaitingForAgent(request.threads, request.decisions)
  const ofRequestedTypes = waiting.filter((item) => request.types.includes(itemType(item)))
  const printed = request.includeSeen
    ? ofRequestedTypes
    : ofRequestedTypes.filter((item) => lastEventOf(item) > request.lastPrinted[itemType(item)])
  const lastPrintedFor = (type: ItemType): number =>
    request.types.includes(type) ? latest : request.lastPrinted[type]
  const notRequested = (types: readonly ItemType[]): ItemCount[] =>
    countsByType(
      waiting.filter(
        (item) => types.includes(itemType(item)) && !request.types.includes(itemType(item)),
      ),
    )
  return {
    printed: printed.toSorted((first, second) => lastEventOf(first) - lastEventOf(second)),
    seenBefore: ofRequestedTypes.length - printed.length,
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
