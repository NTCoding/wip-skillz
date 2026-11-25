import { afterEach, describe, expect, it } from 'vitest'
import { DecisionDoneError } from '../decisions/decision-review'
import { EmptyOutcomeError } from '../threads/thread'
import { exportJobAddress, servedLinks } from '../item-links/item-links-fixtures'
import { InvalidItemIdError } from '../items/item-id'
import { nickRequestsChanges } from '../nick-actions/nick-actions'
import {
  exportJobScratchPad,
  freezeClockAt,
  removeTemporaryHomes,
  temporaryHome,
} from '../scratch-pad-folder/scratch-pad-folder-fixtures'
import { UnknownDecisionError } from '../scratch-pad-folder/stored-decision-answers'
import { mainAgentTypes } from '../agent-inbox/agent-inbox'
import { commentAndGrammarNoteAndDecision } from './agent-commands-fixtures'
import { readAgentInbox, scratchPadStatus } from './inbox-commands'
import { finishItem, ReopenNotDecisionError, reopenItem, showItem } from './thread-commands'

const time = '2026-03-14T09:30:00.000Z'
const question = 'Will the retry limit be 8?'
const decision = { id: 'd-2', page: 'index', line: 20, question }

freezeClockAt(time)

afterEach(() => {
  removeTemporaryHomes()
})

function padWithTwoRounds() {
  const folder = padWithChangesRequested()
  reopenItem(folder, 'd-2', 'Added who the team is.', servedLinks)
  nickRequestsChanges(folder, { ...decision, reason: 'Say which person on the team.' })
  return folder
}

function padWithChangesRequested() {
  const folder = exportJobScratchPad(temporaryHome())
  commentAndGrammarNoteAndDecision(folder)
  nickRequestsChanges(folder, { ...decision, reason: 'The options never say who the team is.' })
  return folder
}

const inboxOf = (folder: ReturnType<typeof exportJobScratchPad>, includeSeen = false) =>
  readAgentInbox(folder, { types: mainAgentTypes, includeSeen }, servedLinks)

describe('the agent inbox with a decision that Nick has sent back', () => {
  it('prints a decision with changes requested with the reason and the command that reopens it', () => {
    expect(inboxOf(padWithChangesRequested())).toContain(
      [
        '[d-2] decision · pages/index.md:20 · "Will the retry limit be 8?" · changes requested',
        `  link: ${exportJobAddress}#d-2`,
        '  Nick requested changes: The options never say who the team is.',
        '  Change the page, then run: reopen d-2 "<what you changed>"',
      ].join('\n'),
    )
  })

  it('prints a decision with changes requested again when seen items are included', () => {
    const folder = padWithChangesRequested()
    inboxOf(folder)

    expect(inboxOf(folder)).toContain('nothing new')
    expect(inboxOf(folder, true)).toContain('changes requested')
  })

  it('stops printing a decision with changes requested after the agent has reopened it', () => {
    const folder = padWithChangesRequested()
    reopenItem(folder, 'd-2', 'Added who the team is.', servedLinks)

    expect(inboxOf(folder, true)).not.toContain('d-2')
  })

  it('counts a decision with changes requested as waiting for the agent in the status', () => {
    expect(scratchPadStatus(padWithChangesRequested(), servedLinks)).toContain(
      'waiting for the agent: 1 comment, 2 decisions, 1 grammar note',
    )
  })
})

describe('showItem for a decision that Nick has sent back', () => {
  it('prints the state and the reason of a decision with changes requested', () => {
    expect(showItem(padWithChangesRequested(), 'd-2', servedLinks)).toBe(
      [
        '[d-2] decision · pages/index.md:20 · "Will the retry limit be 8?" · changes requested',
        `  link: ${exportJobAddress}#d-2`,
        '  1. Nick requested changes: The options never say who the team is.',
      ].join('\n'),
    )
  })

  it('prints the reason and the outcome of a reopened decision', () => {
    const folder = padWithChangesRequested()
    reopenItem(folder, 'd-2', 'Added who the team is.', servedLinks)

    expect(showItem(folder, 'd-2', servedLinks)).toContain(
      [
        '  1. Nick requested changes: The options never say who the team is.',
        '     outcome: Added who the team is.',
      ].join('\n'),
    )
  })

  it('prints the answer followed by the review when a reopened decision is answered', () => {
    const folder = padWithChangesRequested()
    reopenItem(folder, 'd-2', 'Added who the team is.', servedLinks)
    folder.change((pad) =>
      pad.writeDecisionAnswer({
        id: 'd-2',
        page: 'pages/index.md',
        line: 20,
        question,
        answer: { choice: 'proposal' },
        outcome: undefined,
        time,
      }),
    )

    expect(showItem(folder, 'd-2', servedLinks)).toBe(
      [
        '[d-2] decision · pages/index.md:20 · "Will the retry limit be 8?" · waits for the agent',
        `  link: ${exportJobAddress}#d-2`,
        '  Nick chose: proposal',
        '  1. Nick requested changes: The options never say who the team is.',
        '     outcome: Added who the team is.',
      ].join('\n'),
    )
  })
})

describe('a decision with 2 rounds of changes requested', () => {
  it('lists every round of the decision oldest first with its reason and its outcome when the agent shows the decision', () => {
    expect(showItem(padWithTwoRounds(), 'd-2', servedLinks)).toBe(
      [
        '[d-2] decision · pages/index.md:20 · "Will the retry limit be 8?" · changes requested',
        `  link: ${exportJobAddress}#d-2`,
        '  1. Nick requested changes: The options never say who the team is.',
        '     outcome: Added who the team is.',
        '  2. Nick requested changes: Say which person on the team.',
      ].join('\n'),
    )
  })

  it('prints only the newest request in the inbox', () => {
    const printed = inboxOf(padWithTwoRounds())

    expect(printed).toContain('  Nick requested changes: Say which person on the team.')
    expect(printed).not.toContain('The options never say who the team is.')
  })

  it('prints the newest request once and prints the next request after it', () => {
    const folder = padWithChangesRequested()
    inboxOf(folder)
    reopenItem(folder, 'd-2', 'Added who the team is.', servedLinks)
    nickRequestsChanges(folder, { ...decision, reason: 'Say which person on the team.' })

    expect(inboxOf(folder)).toContain('Say which person on the team.')
    expect(inboxOf(folder)).toContain('nothing new')
  })

  it('closes only the open round when the agent reopens the decision', () => {
    const folder = padWithTwoRounds()

    reopenItem(folder, 'd-2', 'Named the person.', servedLinks)

    expect(
      folder.read((pad) => pad.readDecisionRounds('d-2').map((round) => round.outcome)),
    ).toStrictEqual(['Added who the team is.', 'Named the person.'])
  })

  it('still refuses a third request while the second round is open', () => {
    expect(() =>
      nickRequestsChanges(padWithTwoRounds(), { ...decision, reason: 'Again.' }),
    ).toThrow('Decision d-2 waits for the agent to change the page')
  })
})

describe('showItem for a decision without an answer or a review', () => {
  it('throws UnknownDecisionError', () => {
    expect(() => showItem(padWithChangesRequested(), 'd-7', servedLinks)).toThrow(
      UnknownDecisionError,
    )
  })
})

describe('finishItem for a decision that Nick has sent back', () => {
  it('tells the agent to reopen a decision with changes requested instead of marking it as done', () => {
    const folder = padWithChangesRequested()

    expect(() => finishItem(folder, 'd-2', 'Changed.', servedLinks)).toThrow(DecisionDoneError)
    expect(() => finishItem(folder, 'd-2', 'Changed.', servedLinks)).toThrow(
      'Decision d-2 has changes requested. Change the page. Then run reopen d-2 with a line about the change.',
    )
  })
})

describe('reopenItem', () => {
  it('moves the decision back to open with the outcome and records a decision-reopened event by the agent', () => {
    const folder = padWithChangesRequested()

    expect(reopenItem(folder, 'd-2', ' Added who the team is. ', servedLinks)).toBe(
      `d-2 is open again\nlink: ${exportJobAddress}#d-2`,
    )
    expect(folder.read((pad) => pad.readDecisionRounds('d-2'))).toMatchObject([
      {
        reason: 'The options never say who the team is.',
        outcome: 'Added who the team is.',
      },
    ])
    expect(folder.read((pad) => pad.readEvents()).at(-1)).toMatchObject({
      kind: 'decision-reopened',
      by: 'agent',
      item: 'd-2',
    })
  })

  it('throws ReopenNotDecisionError when the id belongs to a comment', () => {
    expect(() => reopenItem(padWithChangesRequested(), 'c-1', 'Changed.', servedLinks)).toThrow(
      ReopenNotDecisionError,
    )
  })

  it('throws InvalidItemIdError when the id is not an item id', () => {
    expect(() => reopenItem(padWithChangesRequested(), 'x', 'Changed.', servedLinks)).toThrow(
      InvalidItemIdError,
    )
  })

  it('throws DecisionNotWaitingForChangesError for a decision that Nick has not reviewed', () => {
    expect(() => reopenItem(padWithChangesRequested(), 'd-1', 'Changed.', servedLinks)).toThrow(
      "Decision d-1 doesn't have any changes requested, so there isn't anything to reopen.",
    )
  })

  it('throws EmptyOutcomeError and keeps the changes requested when the outcome is empty', () => {
    const folder = padWithChangesRequested()

    expect(() => reopenItem(folder, 'd-2', '  ', servedLinks)).toThrow(EmptyOutcomeError)
    expect(folder.read((pad) => pad.readDecisionRounds('d-2').at(-1)?.outcome)).toBeUndefined()
  })
})
