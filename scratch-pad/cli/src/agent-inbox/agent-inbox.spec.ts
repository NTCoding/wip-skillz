import { describe, expect, it } from 'vitest'
import { aDecisionAnswer } from '../decisions/decision-answer-fixtures'
import { type ScratchPadEvent } from '../events/scratch-pad-event'
import { trackerWithSubtasks } from '../progress-tracker/progress-tracker-fixtures'
import { aThread } from '../threads/thread-fixtures'
import {
  countsByType,
  itemId,
  itemsWaitingForAgent,
  mainAgentTypes,
  nothingPrinted,
  selectAgentInbox,
  tasksDoneByNick,
  type AgentInboxRequest,
} from './agent-inbox'

const time = '2026-03-14T09:30:00.000Z'

function opened(number: number, item: string): ScratchPadEvent {
  return { number, time, kind: 'thread-opened', by: 'nick', item }
}

const comment = aThread({ id: 'c-1' })
const grammarNote = aThread({ id: 'g-1', type: 'grammar' })
const decision = aDecisionAnswer({ id: 'd-1' })

// Subtask 2.1 has the id t-4 and subtask 2.2 has the id t-5.
const tracker = trackerWithSubtasks(['done', 'done'])

function doneBy(by: 'nick' | 'agent', number: number, item: string): ScratchPadEvent {
  return { number, time, kind: 'task-done', by, item }
}

function startedBy(by: 'nick' | 'agent', number: number, item: string): ScratchPadEvent {
  return { number, time, kind: 'task-started', by, item }
}

const request: AgentInboxRequest = {
  threads: [comment, grammarNote],
  decisions: [decision],
  tracker,
  events: [opened(1, 'd-1'), opened(2, 'g-1'), opened(3, 'c-1')],
  lastPrinted: nothingPrinted,
  types: mainAgentTypes,
  includeSeen: false,
}

describe('itemsWaitingForAgent', () => {
  it('returns the threads that wait for the agent and the answers that the agent has not followed', () => {
    const items = itemsWaitingForAgent(
      [
        comment,
        aThread({ id: 'c-2', waitsFor: 'nick' }),
        aThread({ id: 'c-3', waitsFor: 'nobody' }),
      ],
      [decision, aDecisionAnswer({ id: 'd-2', outcome: 'Showed the tax number.' })],
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

  it('counts the tasks that Nick has done after the decisions', () => {
    const items = [
      ...itemsWaitingForAgent([grammarNote, comment], [decision]),
      ...tasksDoneByNick({ ...request, events: [doneBy('nick', 4, 't-5')] }),
    ]

    expect(countsByType(items)).toStrictEqual([
      { type: 'comment', count: 1 },
      { type: 'decision', count: 1 },
      { type: 'task', count: 1 },
      { type: 'grammar', count: 1 },
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

  it('counts a task that Nick has done as an other item when only comments are requested', () => {
    const selection = selectAgentInbox({
      ...request,
      types: ['comment'],
      events: [...request.events, doneBy('nick', 4, 't-5')],
    })

    expect(selection.otherItems).toStrictEqual([
      { type: 'decision', count: 1 },
      { type: 'task', count: 1 },
    ])
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

  it('prints a subtask once after Nick has marked it as done', () => {
    const events = [...request.events, doneBy('nick', 4, 't-5')]
    const first = selectAgentInbox({ ...request, events })
    const second = selectAgentInbox({ ...request, events, lastPrinted: first.lastPrinted })

    expect([first.printed.map(itemId), second.printed.map(itemId)]).toStrictEqual([
      ['d-1', 'c-1', 't-5'],
      [],
    ])
  })

  it('prints the subtask that the server started after the subtask that Nick has done', () => {
    const selection = selectAgentInbox({
      ...request,
      tracker: trackerWithSubtasks(['done', 'in-progress']),
      events: [...request.events, doneBy('nick', 4, 't-4'), startedBy('nick', 5, 't-5')],
    })

    expect(selection.printed.at(-1)).toMatchObject({
      kind: 'task',
      task: { id: 't-4' },
      started: { id: 't-5', state: 'in-progress' },
    })
  })

  it("doesn't print a subtask that the agent started after Nick's subtask as started by Nick", () => {
    const selection = selectAgentInbox({
      ...request,
      tracker: trackerWithSubtasks(['done', 'in-progress']),
      events: [...request.events, doneBy('nick', 4, 't-4'), startedBy('agent', 5, 't-5')],
    })

    expect(selection.printed.at(-1)).toMatchObject({ task: { id: 't-4' }, started: undefined })
  })

  it("doesn't print a subtask that the agent has marked as done", () => {
    const selection = selectAgentInbox({
      ...request,
      events: [...request.events, doneBy('agent', 4, 't-5')],
    })

    expect(selection.printed.map(itemId)).toStrictEqual(['d-1', 'c-1'])
  })

  it("doesn't print a subtask that the agent has started again since Nick marked it as done", () => {
    const selection = selectAgentInbox({
      ...request,
      tracker: trackerWithSubtasks(['done', 'in-progress']),
      events: [...request.events, doneBy('nick', 4, 't-5')],
    })

    expect(selection.printed.map(itemId)).toStrictEqual(['d-1', 'c-1'])
  })

  it("doesn't print a task that Nick has done when the decisions aren't requested", () => {
    const selection = selectAgentInbox({
      ...request,
      types: ['comment'],
      events: [...request.events, doneBy('nick', 4, 't-5')],
    })

    expect(selection.printed.map(itemId)).toStrictEqual(['c-1'])
  })

  it("doesn't count a task that Nick has done as printed before", () => {
    const selection = selectAgentInbox({
      ...request,
      events: [...request.events, doneBy('nick', 4, 't-5')],
      lastPrinted: { ...nothingPrinted, comment: 3, decision: 3 },
    })

    expect([selection.printed.map(itemId), selection.seenBefore]).toStrictEqual([['t-5'], 2])
  })
})
