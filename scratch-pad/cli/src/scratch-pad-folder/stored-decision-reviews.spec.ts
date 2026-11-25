import { describe, expect, it } from 'vitest'
import { aDecisionReview } from '../decisions/decision-review-fixtures'
import { exportJobPadName, inMemoryPadDb } from './scratch-pad-folder-fixtures'
import { StoredDecisionReviews } from './stored-decision-reviews'

const storedReviews = () => new StoredDecisionReviews(inMemoryPadDb(), exportJobPadName)

describe('StoredDecisionReviews', () => {
  it('reads back every round in the order of the decision numbers and then the rounds', () => {
    const stored = storedReviews()
    const rounds = [
      aDecisionReview({ id: 'd-10' }),
      aDecisionReview({ id: 'd-2', round: 2 }),
      aDecisionReview({ id: 'd-2', outcome: 'Added who the team is.' }),
    ]
    rounds.forEach((round) => stored.write(round))

    expect(stored.readAll()).toStrictEqual([rounds[2], rounds[1], rounds[0]])
  })

  it('keeps the first round when a second round of the same decision is written', () => {
    const stored = storedReviews()
    const first = aDecisionReview({ outcome: 'Added who the team is.' })
    const second = aDecisionReview({ round: 2, reason: 'Name the team.' })
    stored.write(first)
    stored.write(second)

    expect(stored.readRounds('d-1')).toStrictEqual([first, second])
  })

  it('reads only the rounds of the decision that is asked for', () => {
    const stored = storedReviews()
    stored.write(aDecisionReview({ id: 'd-3' }))
    stored.write(aDecisionReview({ id: 'd-4' }))

    expect(stored.readRounds('d-3')).toStrictEqual([aDecisionReview({ id: 'd-3' })])
  })

  it('reads no rounds when the decision does not have any', () => {
    expect(storedReviews().readRounds('d-4')).toStrictEqual([])
  })

  it('replaces a round when the same round is written again with an outcome', () => {
    const stored = storedReviews()
    stored.write(aDecisionReview({}))
    stored.write(aDecisionReview({ outcome: 'Named the team.' }))

    expect(stored.readAll()).toStrictEqual([aDecisionReview({ outcome: 'Named the team.' })])
  })

  it('refuses an empty reason, an empty outcome and a round below 1', () => {
    const stored = storedReviews()

    expect(() => stored.write(aDecisionReview({ reason: ' \n ' }))).toThrow(/CHECK constraint/)
    expect(() => stored.write(aDecisionReview({ outcome: ' ' }))).toThrow(/CHECK constraint/)
    expect(() => stored.write(aDecisionReview({ round: 0 }))).toThrow(/CHECK constraint/)
  })
})
