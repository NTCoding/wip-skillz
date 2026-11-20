import { describe, expect, it } from 'vitest'
import { aDecisionAnswer } from '../decisions/decision-answer-fixtures'
import { InvalidDecisionIdError } from '../items/item-id'
import { exportJobPadName, inMemoryPadDb } from './scratch-pad-folder-fixtures'
import { StoredDecisionAnswers, UnknownDecisionError } from './stored-decision-answers'

const storedDecisionAnswers = () => new StoredDecisionAnswers(inMemoryPadDb(), exportJobPadName)

describe('StoredDecisionAnswers', () => {
  it('reads back the decision answers in the order of their numbers when they were written in another order', () => {
    const stored = storedDecisionAnswers()
    const answers = [
      aDecisionAnswer({ id: 'd-10', answer: { written: 'Only for companies.' } }),
      aDecisionAnswer({ id: 'd-2', seenByAgent: true }),
    ]
    answers.forEach((answer) => stored.write(answer))

    expect(stored.readAll()).toStrictEqual([answers[1], answers[0]])
  })

  it('replaces a decision answer when an answer with the same id is written', () => {
    const stored = storedDecisionAnswers()
    stored.write(aDecisionAnswer({}))
    stored.write(aDecisionAnswer({ answer: { choice: 'alternative' } }))

    expect(stored.read('d-1')).toStrictEqual(aDecisionAnswer({ answer: { choice: 'alternative' } }))
  })

  it('throws UnknownDecisionError when the decision answer does not exist', () => {
    const read = () => storedDecisionAnswers().read('d-4')

    expect(read).toThrow(UnknownDecisionError)
    expect(read).toThrow("There isn't any answered decision called d-4 in 2026-03-14-export-job.")
  })

  it('throws InvalidDecisionIdError when the id belongs to a comment', () => {
    const read = () => storedDecisionAnswers().read('c-1')

    expect(read).toThrow(InvalidDecisionIdError)
    expect(read).toThrow('"c-1" isn\'t the id of a decision. A decision id looks like d-1.')
  })
})
