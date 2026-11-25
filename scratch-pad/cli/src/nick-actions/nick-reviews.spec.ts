import { afterEach, describe, expect, it } from 'vitest'
import {
  DecisionAlreadyAnsweredError,
  DecisionSentBackError,
  EmptyReasonError,
  reopenDecision,
} from '../decisions/decision-review'
import {
  exportJobScratchPad,
  freezeClockAt,
  removeTemporaryHomes,
  temporaryHome,
} from '../scratch-pad-folder/scratch-pad-folder-fixtures'
import { nickAnswersDecision, nickRequestsChanges } from './nick-actions'

const time = '2026-03-14T09:30:00.000Z'
const question = 'Will the invoice template show the tax number?'
const decision = { id: 'd-1', page: 'index', line: 9, question }

freezeClockAt(time)

afterEach(() => {
  removeTemporaryHomes()
})

function reopened() {
  const folder = exportJobScratchPad(temporaryHome())
  nickRequestsChanges(folder, { ...decision, reason: 'Who is the team?' })
  folder.change((pad) =>
    pad.writeDecisionReview(
      reopenDecision('d-1', pad.readDecisionRounds('d-1'), 'Added who the team is.'),
    ),
  )
  return folder
}

describe('nickRequestsChanges', () => {
  it('saves the review with the reason and records a decision-changes-requested event by Nick', () => {
    const folder = exportJobScratchPad(temporaryHome())

    nickRequestsChanges(folder, { ...decision, reason: 'Who is the team?' })

    expect(folder.read((pad) => pad.readDecisionRounds('d-1'))).toStrictEqual([
      {
        id: 'd-1',
        page: 'pages/index.md',
        line: 9,
        question,
        round: 1,
        reason: 'Who is the team?',
        outcome: undefined,
        time,
      },
    ])
    expect(folder.read((pad) => pad.readEvents().at(-1))).toMatchObject({
      kind: 'decision-changes-requested',
      by: 'nick',
      item: 'd-1',
    })
  })

  it('refuses an empty reason and saves nothing', () => {
    const folder = exportJobScratchPad(temporaryHome())

    expect(() => nickRequestsChanges(folder, { ...decision, reason: '  ' })).toThrow(
      EmptyReasonError,
    )
    expect(folder.read((pad) => pad.readDecisionReviews())).toStrictEqual([])
  })

  it('refuses a decision that Nick has answered', () => {
    const folder = exportJobScratchPad(temporaryHome())
    nickAnswersDecision(folder, { ...decision, answer: { choice: 'proposal' } })

    expect(() => nickRequestsChanges(folder, { ...decision, reason: 'No.' })).toThrow(
      DecisionAlreadyAnsweredError,
    )
  })

  it('refuses a decision that already waits for the agent', () => {
    const folder = exportJobScratchPad(temporaryHome())
    nickRequestsChanges(folder, { ...decision, reason: 'Who is the team?' })

    expect(() => nickRequestsChanges(folder, { ...decision, reason: 'Again.' })).toThrow(
      DecisionSentBackError,
    )
  })

  it('keeps the first round and adds a second round when Nick asks for changes again after the decision was reopened', () => {
    const folder = reopened()

    nickRequestsChanges(folder, { ...decision, reason: 'Still unclear.' })

    expect(
      folder.read((pad) =>
        pad.readDecisionRounds('d-1').map(({ round, reason, outcome }) => ({
          round,
          reason,
          outcome,
        })),
      ),
    ).toStrictEqual([
      { round: 1, reason: 'Who is the team?', outcome: 'Added who the team is.' },
      { round: 2, reason: 'Still unclear.', outcome: undefined },
    ])
  })
})

describe('nickAnswersDecision after a review', () => {
  it('refuses to answer a decision that waits for changes', () => {
    const folder = exportJobScratchPad(temporaryHome())
    nickRequestsChanges(folder, { ...decision, reason: 'Who is the team?' })

    expect(() =>
      nickAnswersDecision(folder, { ...decision, answer: { choice: 'proposal' } }),
    ).toThrow(DecisionSentBackError)
    expect(folder.read((pad) => pad.readDecisionAnswers())).toStrictEqual([])
  })

  it('lets Nick answer the decision once the agent has reopened it', () => {
    const folder = reopened()

    nickAnswersDecision(folder, { ...decision, answer: { choice: 'proposal' } })

    expect(folder.read((pad) => pad.readDecisionAnswer('d-1')).answer).toStrictEqual({
      choice: 'proposal',
    })
  })
})
