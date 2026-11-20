import { describe, expect, it } from 'vitest'
import { aDecisionAnswer } from '../decisions/decision-answer-fixtures'
import { type ScratchPadEvent } from '../events/scratch-pad-event'
import { aThread } from '../threads/thread-fixtures'
import {
  countsByType,
  itemId,
  itemsWaitingForAgent,
  mainAgentTypes,
  nothingPrinted,
  selectAgentInbox,
  type AgentInboxRequest,
} from './agent-inbox'

const time = '2026-03-14T09:30:00.000Z'

function opened(number: number, item: string): ScratchPadEvent {
  return { number, time, kind: 'thread-opened', by: 'nick', item }
}

const comment = aThread({ id: 'c-1' })
const grammarNote = aThread({ id: 'g-1', type: 'grammar' })
const decision = aDecisionAnswer({ id: 'd-1' })

const request: AgentInboxRequest = {
  threads: [comment, grammarNote],
  decisions: [decision],
  events: [opened(1, 'd-1'), opened(2, 'g-1'), opened(3, 'c-1')],
  lastPrinted: nothingPrinted,
  types: mainAgentTypes,
  includeSeen: false,
}

describe('itemsWaitingForAgent', () => {
  it('returns the threads that wait for the agent and the answers the agent has not seen', () => {
    const items = itemsWaitingForAgent(
      [
        comment,
        aThread({ id: 'c-2', waitsFor: 'nick' }),
        aThread({ id: 'c-3', waitsFor: 'nobody' }),
      ],
      [decision, aDecisionAnswer({ id: 'd-2', seenByAgent: true })],
    )

    expect(items.map(itemId)).toStrictEqual(['c-1', 'd-1'])
  })
})

describe('countsByType', () => {
  it('counts the items per type in a fixed order', () => {
    const items = itemsWaitingForAgent(
      [grammarNote, comment, aThread({ id: 'g-2', type: 'grammar' })],
      [decision],
    )

    expect(countsByType(items)).toStrictEqual([
      { type: 'comment', count: 1 },
      { type: 'decision', count: 1 },
      { type: 'grammar', count: 2 },
    ])
  })

  it('leaves out the types without any items', () => {
    expect(countsByType(itemsWaitingForAgent([grammarNote], []))).toStrictEqual([
      { type: 'grammar', count: 1 },
    ])
  })
})

describe('selectAgentInbox', () => {
  it('prints the comments and decisions in the order of their last event', () => {
    expect(selectAgentInbox(request).printed.map(itemId)).toStrictEqual(['d-1', 'c-1'])
  })

  it('counts the grammar and improvement notes as side notes when they are not requested', () => {
    expect(selectAgentInbox(request).sideNotes).toStrictEqual([{ type: 'grammar', count: 1 }])
  })

  it('counts the decisions as other items when only comments are requested', () => {
    const selection = selectAgentInbox({ ...request, types: ['comment'] })

    expect(selection.otherItems).toStrictEqual([{ type: 'decision', count: 1 }])
  })

  it('counts no other items when the comments and the decisions are requested', () => {
    expect(selectAgentInbox(request).otherItems).toStrictEqual([])
  })

  it('records the latest event for the requested types only', () => {
    expect(selectAgentInbox(request).lastPrinted).toStrictEqual({
      comment: 3,
      decision: 3,
      grammar: 0,
      improvement: 0,
    })
  })

  it('leaves out the items whose last event was printed before', () => {
    const selection = selectAgentInbox({
      ...request,
      lastPrinted: { ...nothingPrinted, comment: 3, decision: 3 },
    })

    expect([selection.printed, selection.seenBefore]).toStrictEqual([[], 2])
  })

  it('prints the items that were printed before when seen items are included', () => {
    const selection = selectAgentInbox({
      ...request,
      lastPrinted: { ...nothingPrinted, comment: 3, decision: 3 },
      includeSeen: true,
    })

    expect(selection.printed.map(itemId)).toStrictEqual(['d-1', 'c-1'])
  })

  it('prints a thread again when Nick has replied after it was printed', () => {
    const selection = selectAgentInbox({
      ...request,
      events: [
        ...request.events,
        { number: 4, time, kind: 'thread-replied', by: 'nick', item: 'c-1' },
      ],
      lastPrinted: { ...nothingPrinted, comment: 3, decision: 3 },
    })

    expect(selection.printed.map(itemId)).toStrictEqual(['c-1'])
  })

  it('prints the side notes in full when they are requested', () => {
    const selection = selectAgentInbox({ ...request, types: ['grammar', 'improvement'] })

    expect(selection.printed.map(itemId)).toStrictEqual(['g-1'])
  })

  it('counts no side notes when they are requested', () => {
    const selection = selectAgentInbox({ ...request, types: ['grammar', 'improvement'] })

    expect(selection.sideNotes).toStrictEqual([])
  })

  it('prints an item without any event as new so that it is never lost', () => {
    const selection = selectAgentInbox({
      ...request,
      events: [opened(3, 'c-1')],
      lastPrinted: { ...nothingPrinted, comment: 3, decision: 3 },
    })

    expect(selection.printed.map(itemId)).toStrictEqual(['d-1'])
  })
})
