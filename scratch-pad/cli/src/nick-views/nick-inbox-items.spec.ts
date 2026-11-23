import { readFileSync, utimesSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { replyToThread } from '../agent-commands/thread-commands'
import { nickAnswersDecision, nickComments } from '../nick-actions/nick-actions'
import { unservedLinks } from '../item-links/item-links-fixtures'
import {
  exportJobScratchPad,
  freezeClockAt,
  removeTemporaryHomes,
  temporaryHome,
  writeFileInPad,
} from '../scratch-pad-folder/scratch-pad-folder-fixtures'
import { type ScratchPadFolder } from '../scratch-pad-folder/scratch-pad-folder'
import { retryAnchor } from '../threads/thread-fixtures'
import {
  invoiceDecisionsSavedTime,
  nickAnswersRetryQuestion,
  retryQuestion,
  taxQuestion,
  writeInvoiceDecisionsPage,
  writeRetryChoicesPage,
} from './nick-views-fixtures'
import { nickInboxItems } from './nick-views'

freezeClockAt('2026-03-14T09:30:00.000Z')

afterEach(() => {
  removeTemporaryHomes()
})

function folderWithDecisions(): ScratchPadFolder {
  const folder = exportJobScratchPad(temporaryHome())
  writeInvoiceDecisionsPage(folder)
  return folder
}

function commentOnRetryPolicy(folder: ScratchPadFolder, text: string): void {
  nickComments(folder, { type: 'comment', page: 'pages/index.md', anchor: retryAnchor, text })
}

describe('nickInboxItems', () => {
  it('returns the threads that wait for Nick and the decisions that Nick has not answered', () => {
    const folder = folderWithDecisions()
    commentOnRetryPolicy(folder, 'Is 5 retries enough?')
    commentOnRetryPolicy(folder, 'Is 30 seconds enough?')
    replyToThread(folder, 'c-2', 'I have raised the wait to 60 seconds.', unservedLinks)
    nickAnswersRetryQuestion(folder)

    const inbox = nickInboxItems(folder)

    expect(inbox.threads.map((thread) => [thread.id, thread.position?.kind])).toStrictEqual([
      ['c-2', 'attached'],
    ])
    expect(inbox.decisions).toStrictEqual([
      {
        page: 'pages/invoice-decisions.md',
        id: 'd-2',
        line: 13,
        question: taxQuestion,
        time: invoiceDecisionsSavedTime,
        context: undefined,
      },
    ])
  })

  it('records the time that the page was saved when the decision is first found and keeps that time after the page is saved again', () => {
    const folder = folderWithDecisions()
    const retryChoicesSavedTime = '2026-03-14T09:10:00.000Z'
    const asked = () =>
      folder
        .read((pad) => pad.readEvents())
        .filter((event) => event.kind === 'decision-asked')
        .map((event) => [event.item, event.time, event.by])

    nickInboxItems(folder)
    writeFileInPad(
      folder,
      'pages/invoice-decisions.md',
      `${readFileSync(join(folder.path, 'pages/invoice-decisions.md'), 'utf8')}\nThe tax number is new.\n`,
    )
    writeRetryChoicesPage(folder)
    const saved = new Date(retryChoicesSavedTime)
    utimesSync(join(folder.path, 'pages/retry-choices.md'), saved, saved)

    expect(
      nickInboxItems(folder).decisions.map((decision) => [decision.id, decision.time]),
    ).toStrictEqual([
      ['d-1', invoiceDecisionsSavedTime],
      ['d-2', invoiceDecisionsSavedTime],
      ['d-3', retryChoicesSavedTime],
      ['d-4', retryChoicesSavedTime],
    ])
    expect(asked()).toStrictEqual([
      ['d-1', invoiceDecisionsSavedTime, 'agent'],
      ['d-2', invoiceDecisionsSavedTime, 'agent'],
      ['d-3', retryChoicesSavedTime, 'agent'],
      ['d-4', retryChoicesSavedTime, 'agent'],
    ])
  })

  it('doesn’t record a decision that Nick has already answered', () => {
    const folder = folderWithDecisions()
    nickAnswersRetryQuestion(folder)
    nickInboxItems(folder)

    expect(
      folder
        .read((pad) => pad.readEvents())
        .map((event) => [event.kind, event.item])
        .slice(-2),
    ).toStrictEqual([
      ['decision-answered', 'd-1'],
      ['decision-asked', 'd-2'],
    ])
  })

  it('returns the first paragraph and the links to the pages of a decision’s context', () => {
    const folder = exportJobScratchPad(temporaryHome())
    writeFileInPad(
      folder,
      'pages/schedule.md',
      [
        '## Will the job export at night?',
        '',
        ':::decision d-7',
        'context: The shops close at night. Read these in order:',
        '  1. [The retry policy](index.md#retry-policy) shows how long a retry can take.',
        '  2. [The shops](https://example.com/shops) explains when a shop opens.',
        'proposal: Export at night.',
        'alternative: Export every hour.',
        'pick: proposal',
        ':::',
        '',
      ].join('\n'),
    )

    expect(nickInboxItems(folder).decisions.map((decision) => decision.context)).toStrictEqual([
      {
        lead: 'The shops close at night. Read these in order:',
        links: [{ text: 'The retry policy', page: 'pages/index.md', headingId: 'retry-policy' }],
      },
    ])
  })

  it('keeps the other decision under the same heading when Nick has answered one of them', () => {
    const folder = exportJobScratchPad(temporaryHome())
    writeRetryChoicesPage(folder)
    nickAnswersDecision(folder, {
      id: 'd-3',
      page: 'pages/retry-choices.md',
      line: 5,
      question: retryQuestion,
      answer: { choice: 'proposal' },
    })

    expect(
      nickInboxItems(folder).decisions.map(({ page, id, line, question }) => ({
        page,
        id,
        line,
        question,
      })),
    ).toStrictEqual([
      { page: 'pages/retry-choices.md', id: 'd-4', line: 11, question: retryQuestion },
    ])
  })

  it("leaves out the decision when there aren't any headings above the decision", () => {
    const folder = exportJobScratchPad(temporaryHome())
    writeFileInPad(
      folder,
      'pages/schedule.md',
      ':::decision d-7\nproposal: Export at night.\nalternative: Export every hour.\npick: proposal\n:::\n',
    )

    expect(nickInboxItems(folder).decisions).toStrictEqual([])
  })
})
