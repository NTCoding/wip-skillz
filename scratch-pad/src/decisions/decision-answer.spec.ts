import { describe, expect, it } from 'vitest'
import { EmptyAnswerError, answerDecision, answerLine, markSeenByAgent } from './decision-answer'
import { aDecisionAnswer } from './decision-answer-fixtures'

const question = 'Will the invoice template show the tax number?'

describe('answerDecision', () => {
  it('stores the answer as not seen by the agent', () => {
    const decision = answerDecision(
      'd-1',
      { page: 'pages/index.md', line: 9, question, answer: { choice: 'proposal' } },
      '2026-03-14T09:30:00.000Z',
    )

    expect(decision).toStrictEqual(aDecisionAnswer({}))
  })

  it.each([{ choice: ' ' }, { written: '' }])(
    'throws EmptyAnswerError when the answer is %j',
    (answer) => {
      const answerEmpty = () =>
        answerDecision('d-1', { page: 'pages/index.md', line: 9, question, answer }, 'now')

      expect(answerEmpty).toThrow(EmptyAnswerError)
      expect(answerEmpty).toThrow('The answer is empty.')
    },
  )
})

describe('markSeenByAgent', () => {
  it('marks the answer as seen by the agent', () => {
    expect(markSeenByAgent(aDecisionAnswer({})).seenByAgent).toBe(true)
  })
})

describe('answerLine', () => {
  it('prints the choice of Nick', () => {
    expect(answerLine({ choice: 'alternative' })).toBe('Nick chose: alternative')
  })

  it('prints the written answer of Nick', () => {
    expect(answerLine({ written: 'Only for business customers.' })).toBe(
      'Nick wrote: Only for business customers.',
    )
  })
})
