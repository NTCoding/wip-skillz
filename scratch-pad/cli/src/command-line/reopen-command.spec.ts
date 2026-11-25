import { afterEach, describe, expect, it } from 'vitest'
import { commentAndGrammarNoteAndDecision } from '../agent-commands/agent-commands-fixtures'
import { missingLinksText } from '../item-links/item-links-fixtures'
import { nickRequestsChanges } from '../nick-actions/nick-actions'
import {
  freezeClockAt,
  removeTemporaryHomes,
} from '../scratch-pad-folder/scratch-pad-folder-fixtures'
import { environmentWithScratchPad, runScratchPad, waitReminderText } from './command-line-fixtures'

afterEach(() => {
  removeTemporaryHomes()
})

async function output(argv: readonly string[], environment = environmentWithItems()) {
  const result = await runScratchPad(argv, environment)
  return `${result.stdout}${result.stderr}`
}

function environmentWithItems() {
  return environmentWithScratchPad(commentAndGrammarNoteAndDecision)
}

describe('the reopen command', () => {
  freezeClockAt('2026-03-14T09:30:00.000Z')

  it('reopen prints that the decision is open again', async () => {
    const environment = environmentWithScratchPad((folder) => {
      commentAndGrammarNoteAndDecision(folder)
      nickRequestsChanges(folder, {
        id: 'd-2',
        page: 'index',
        line: 20,
        question: 'Will the retry limit be 8?',
        reason: 'Who is the team?',
      })
    })

    expect(await output(['reopen', 'd-2', 'Added who the team is.'], environment)).toBe(
      `d-2 is open again\n${missingLinksText}\n${waitReminderText}\n`,
    )
  })

  it('reopen prints an error when the decision does not have changes requested', async () => {
    expect(await output(['reopen', 'd-1', 'Added who the team is.'])).toBe(
      "Decision d-1 doesn't have any changes requested, so there isn't anything to reopen.\n",
    )
  })
})
