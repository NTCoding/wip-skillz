import { describe, expect, it } from 'vitest'
import { EmptyDecisionError, logDecision } from './decision-log'

const time = '2026-03-14T09:30:00.000Z'

const fromChat = {
  time,
  source: 'chat' as const,
  text: ' Keep the retry limit at 5. ',
  decision: undefined,
}

const fromPage = {
  time,
  source: 'page' as const,
  text: 'Show the tax number? Nick chose: proposal',
  decision: 'd-1',
}

const chatEntry = {
  number: 1,
  time,
  source: 'chat',
  text: 'Keep the retry limit at 5.',
  decision: undefined,
}

describe('logDecision', () => {
  it('numbers the first entry 1', () => {
    expect(logDecision([], fromChat).entry.number).toBe(1)
  })

  it('trims the text of the entry', () => {
    expect(logDecision([], fromChat).entry.text).toBe('Keep the retry limit at 5.')
  })

  it('adds the entry after the last entry with the next number', () => {
    const first = logDecision([], fromChat)

    expect(logDecision(first.log, fromPage).log).toStrictEqual([
      chatEntry,
      { number: 2, ...fromPage },
    ])
  })

  it('adds a new entry for every decision from the chat', () => {
    const first = logDecision([], fromChat)

    expect(logDecision(first.log, fromChat).entry.number).toBe(2)
  })

  it('replaces the entry of the decision when the decision is already in the log', () => {
    const log = logDecision(logDecision([], fromPage).log, fromChat).log
    const changed = { ...fromPage, text: 'Show the tax number? Nick chose: alternative' }

    expect(logDecision(log, changed).log).toStrictEqual([
      { number: 1, ...changed },
      { ...chatEntry, number: 2 },
    ])
  })

  it('throws EmptyDecisionError when the text is blank', () => {
    expect(() => logDecision([], { ...fromChat, text: ' ' })).toThrow(EmptyDecisionError)
    expect(() => logDecision([], { ...fromChat, text: ' ' })).toThrow('The decision is empty.')
  })
})
