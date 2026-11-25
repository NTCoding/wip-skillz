import { describe, expect, it } from 'vitest'
import { InvalidDecisionIdError } from '../items/item-id'
import { EmptyOutcomeError } from '../threads/thread'
import {
  EmptyAnswerError,
  answerDecision,
  answerLine,
  followDecision,
  loggedAnswerLine,
} from './decision-answer'
import { aDecisionAnswer } from './decision-answer-fixtures'

const question = 'Will the invoice template show the tax number?'

describe('answerDecision', () => {
  it('stores the answer as waiting for the agent', () => {
    const decision = answerDecision(
      { id: 'd-1', page: 'pages/index.md', line: 9, question, answer: { choice: 'proposal' } },
      '2026-03-14T09:30:00.000Z',
    )

    expect(decision).toStrictEqual(aDecisionAnswer({}))
  })

  it.each([{ choice: ' ' }, { written: '' }])(
    'throws EmptyAnswerError when the answer is %j',
    (answer) => {
      const answerEmpty = () =>
        answerDecision({ id: 'd-1', page: 'pages/index.md', line: 9, question, answer }, 'now')

      expect(answerEmpty).toThrow(EmptyAnswerError)
      expect(answerEmpty).toThrow('The answer is empty.')
    },
  )

  it('throws InvalidDecisionIdError when the id is the id of a comment', () => {
    const answerComment = () =>
      answerDecision(
        { id: 'c-1', page: 'pages/index.md', line: 9, question, answer: { choice: 'proposal' } },
        'now',
      )

    expect(answerComment).toThrow(InvalidDecisionIdError)
    expect(answerComment).toThrow(
      '"c-1" isn\'t the id of a decision. A decision id looks like d-1.',
    )
  })
})

describe('followDecision', () => {
  it('stores the trimmed outcome when the agent has followed the decision', () => {
    expect(followDecision(aDecisionAnswer({}), ' Showed the tax number. ').outcome).toBe(
      'Showed the tax number.',
    )
  })

  it('throws EmptyOutcomeError when the outcome is empty', () => {
    const follow = () => followDecision(aDecisionAnswer({}), ' ')

    expect(follow).toThrow(EmptyOutcomeError)
    expect(follow).toThrow('The outcome is empty. Write one line about what was changed.')
  })
})

describe('answerLine', () => {
  it('prints the choice of Nick', () => {
    expect(answerLine({ choice: 'alternative' })).toBe('Nick chose: alternative')
  })

  it('prints the label of the option when the page has the label', () => {
    expect(answerLine({ choice: 'option-2' }, 'Option 2: Double the wait')).toBe(
      'Nick chose: Option 2: Double the wait',
    )
  })

  it('prints the written answer of Nick', () => {
    expect(answerLine({ written: 'Only for business customers.' })).toBe(
      'Nick wrote: Only for business customers.',
    )
  })
})

describe('loggedAnswerLine', () => {
  it('writes the choice and the text of the option of an inline block', () => {
    expect(loggedAnswerLine({ choice: 'proposal' }, 'Raise the limit.')).toBe(
      'Nick chose the proposal: Raise the limit.',
    )
  })

  it('writes the heading of an option on a decision page once', () => {
    expect(loggedAnswerLine({ choice: 'option-2' }, 'Option 2: Double the wait')).toBe(
      'Nick chose: Option 2: Double the wait',
    )
  })

  it('prints the answer without an option when the option isn’t known', () => {
    expect(loggedAnswerLine({ choice: 'proposal' }, undefined)).toBe('Nick chose: proposal')
    expect(loggedAnswerLine({ written: 'Only for business customers.' }, 'Raise it.')).toBe(
      'Nick wrote: Only for business customers.',
    )
  })
})
