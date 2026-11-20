import { describe, expect, it } from 'vitest'
import { aDecisionAnswer } from '../decisions/decision-answer-fixtures'
import { aThread } from '../threads/thread-fixtures'
import {
  decisionAnswerFromFile,
  decisionLogEntryFromLine,
  eventFromLine,
  lastPrintedEventsFromFile,
  progressTrackerFromFile,
  threadFromFile,
} from './file-contents'
import { BrokenFileError } from './json-fields'

describe('threadFromFile', () => {
  it('reads back a thread with an anchor', () => {
    const thread = aThread({})

    expect(threadFromFile(JSON.stringify(thread), 'threads/c-1.json')).toStrictEqual(thread)
  })

  it('reads back a done improvement note without an anchor', () => {
    const thread = aThread({
      id: 'i-1',
      type: 'improvement',
      anchor: undefined,
      waitsFor: 'nobody',
      outcome: 'Added an example.',
    })

    expect(threadFromFile(JSON.stringify(thread), 'threads/i-1.json')).toStrictEqual(thread)
  })

  it('throws BrokenFileError when the thread waits for an unknown party', () => {
    const read = () =>
      threadFromFile(JSON.stringify({ ...aThread({}), waitsFor: 'everyone' }), 'threads/c-1.json')

    expect(read).toThrow(BrokenFileError)
    expect(read).toThrow(
      'threads/c-1.json is broken: "waitsFor" must be one of nick, agent, nobody',
    )
  })

  it('throws BrokenFileError when the thread does not have any messages', () => {
    const read = () =>
      threadFromFile(JSON.stringify({ ...aThread({}), messages: [] }), 'threads/c-1.json')

    expect(read).toThrow(BrokenFileError)
    expect(read).toThrow(
      'threads/c-1.json is broken: "messages" must be a list with at least one entry',
    )
  })
})

describe('decisionAnswerFromFile', () => {
  it('reads back a choice', () => {
    const decision = aDecisionAnswer({})

    expect(
      decisionAnswerFromFile(JSON.stringify(decision), 'decision-answers/d-1.json'),
    ).toStrictEqual(decision)
  })

  it('reads back a written answer', () => {
    const decision = aDecisionAnswer({ answer: { written: 'Only for business customers.' } })

    expect(
      decisionAnswerFromFile(JSON.stringify(decision), 'decision-answers/d-1.json'),
    ).toStrictEqual(decision)
  })
})

describe('progressTrackerFromFile', () => {
  it('reads back the title, the goal and the tasks', () => {
    const tracker = {
      title: 'Export job',
      goal: 'Ship the export job.',
      tasks: [{ number: 1, title: 'Write the retry policy', state: 'in-progress' }],
    }

    expect(progressTrackerFromFile(JSON.stringify(tracker), 'progress-tracker.json')).toStrictEqual(
      tracker,
    )
  })
})

describe('eventFromLine', () => {
  it('reads an event without an item', () => {
    const event = { number: 1, time: '2026-03-14T09:30:00.000Z', kind: 'goal-set', by: 'agent' }

    expect(eventFromLine(JSON.stringify(event), 'events.jsonl line 1')).toStrictEqual({
      ...event,
      item: undefined,
    })
  })
})

describe('decisionLogEntryFromLine', () => {
  it('reads an entry from the chat', () => {
    const entry = {
      number: 2,
      time: '2026-03-14T09:30:00.000Z',
      source: 'chat',
      text: 'Keep 5 retries.',
    }

    expect(
      decisionLogEntryFromLine(JSON.stringify(entry), 'decision-log.jsonl line 2'),
    ).toStrictEqual({
      ...entry,
      decision: undefined,
    })
  })
})

describe('lastPrintedEventsFromFile', () => {
  it('reads the last printed event of each type', () => {
    const lastPrintedEvent = { comment: 4, decision: 4, grammar: 1, improvement: 0 }

    expect(
      lastPrintedEventsFromFile(JSON.stringify({ lastPrintedEvent }), 'agent-inbox.json'),
    ).toStrictEqual(lastPrintedEvent)
  })
})
