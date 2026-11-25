import { describe, expect, it } from 'vitest'
import {
  assertCanBeDecided,
  DecisionNotWaitingForChangesError,
  DecisionSentBackError,
  EmptyReasonError,
  isSentBack,
  reopenDecision,
  requestChanges,
  roundsWaitingForAgent,
  type NewDecisionReview,
} from './decision-review'
import { aDecisionReview } from './decision-review-fixtures'
import { InvalidDecisionIdError } from '../items/item-id'
import { EmptyOutcomeError } from '../threads/thread'

const input: NewDecisionReview = {
  id: 'd-2',
  page: 'pages/1-how-the-job-runs.md',
  line: 12,
  question: 'Will the job tell the team after the last retry?',
  reason: "  The options don't say who the team is.  ",
}

const time = '2026-11-24T10:00:00.000Z'

describe('requestChanges', () => {
  it('saves the trimmed reason as round 1 without an outcome', () => {
    expect(requestChanges(input, [], time)).toStrictEqual({
      ...input,
      round: 1,
      reason: "The options don't say who the team is.",
      outcome: undefined,
      time,
    })
  })

  it('numbers the new round after the earlier rounds', () => {
    const earlier = [aDecisionReview({ id: 'd-2', outcome: 'Changed the page.' })]

    expect(requestChanges(input, earlier, time).round).toBe(2)
  })

  it('refuses an empty reason', () => {
    expect(() => requestChanges({ ...input, reason: ' \n ' }, [], time)).toThrow(EmptyReasonError)
  })

  it('refuses an id that is not a decision id', () => {
    expect(() => requestChanges({ ...input, id: 'c-2' }, [], time)).toThrow(InvalidDecisionIdError)
  })
})

describe('reopenDecision', () => {
  const closed = aDecisionReview({ id: 'd-2', outcome: 'Changed the page.' })
  const open = aDecisionReview({ id: 'd-2', round: 2, reason: 'Still unclear.' })

  it('returns the newest round with the trimmed outcome and keeps the reason', () => {
    expect(reopenDecision('d-2', [closed, open], ' Named the team. ')).toStrictEqual({
      ...open,
      outcome: 'Named the team.',
    })
  })

  it('refuses an empty outcome', () => {
    expect(() => reopenDecision('d-2', [open], '  ')).toThrow(EmptyOutcomeError)
  })

  it.each([[[]], [[closed]]])('explains that there are not any changes to reopen', (rounds) => {
    expect(() => reopenDecision('d-2', rounds, 'Done')).toThrow(DecisionNotWaitingForChangesError)
  })
})

describe('a decision that Nick can still decide', () => {
  const closed = aDecisionReview({ outcome: 'Changed the page.' })
  const open = aDecisionReview({ round: 2 })

  it('is a decision without rounds or with a newest round that has an outcome', () => {
    expect([[], [closed], [closed, open]].map(isSentBack)).toStrictEqual([false, false, true])
    expect(() => assertCanBeDecided('d-1', [])).not.toThrow()
    expect(() => assertCanBeDecided('d-1', [closed])).not.toThrow()
  })

  it('explains why Nick can not decide a decision with changes requested', () => {
    expect(() => assertCanBeDecided('d-1', [closed, open])).toThrow(DecisionSentBackError)
    expect(() => assertCanBeDecided('d-1', [closed, open])).toThrow(
      /waits for the agent to change the page/,
    )
  })
})

describe('roundsWaitingForAgent', () => {
  it('returns only the newest round of each decision, and only when the round has no outcome', () => {
    const rounds = [
      aDecisionReview({ id: 'd-1', outcome: 'Changed the page.' }),
      aDecisionReview({ id: 'd-1', round: 2 }),
      aDecisionReview({ id: 'd-2', outcome: 'Changed the page.' }),
      aDecisionReview({ id: 'd-3' }),
    ]

    expect(roundsWaitingForAgent(rounds)).toStrictEqual([rounds[1], rounds[3]])
  })
})
