import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { replyToThread } from '../agent-commands/thread-commands'
import { logDecisionFromChat } from '../agent-commands/decision-log-commands'
import { addTaskToTracker } from '../agent-commands/progress-tracker-commands'
import { nickAnswersDecision, nickComments, nickResolves } from '../nick-actions/nick-actions'
import { unservedLinks } from '../item-links/item-links-fixtures'
import { UnknownPageError } from '../pages/page-markdown'
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
  nickAnswersRetryQuestion,
  retryQuestion,
  taxQuestion,
  writeInvoiceDecisionsPage,
  writeRetryChoicesPage,
} from './nick-views-fixtures'
import {
  decisionLogOf,
  nickInboxItems,
  pageSummaries,
  progressTrackerOf,
  threadsOfPage,
  viewPage,
} from './nick-views'

const time = '2026-03-14T09:30:00.000Z'

freezeClockAt(time)

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

describe('pageSummaries', () => {
  it('returns each page with its title and its open threads when Nick has commented', () => {
    const folder = exportJobScratchPad(temporaryHome())
    commentOnRetryPolicy(folder, 'Is 5 retries enough?')

    expect(pageSummaries(folder)).toStrictEqual([
      { page: 'pages/index.md', title: 'Export job', openThreads: 1 },
    ])
  })
})

describe('viewPage', () => {
  it('returns the rendered page with its title and headings when the page exists', () => {
    const page = viewPage(exportJobScratchPad(temporaryHome()), 'index')

    expect({ ...page, html: page.html.split('\n')[0] }).toStrictEqual({
      page: 'pages/index.md',
      title: 'Export job',
      html: '<h1 data-lines="1-1" id="export-job">Export job</h1>',
      headings: [
        { level: 1, text: 'Export job', id: 'export-job', line: 1 },
        { level: 2, text: 'Retry policy', id: 'retry-policy', line: 3 },
      ],
      links: [],
      decisions: [],
    })
  })

  it('returns the HTML of the custom file when the page has an html block that reads a file', () => {
    const folder = exportJobScratchPad(temporaryHome())
    mkdirSync(join(folder.path, 'custom'))
    writeFileInPad(folder, 'custom/retry-steps.html', '<ol><li>Retry the export.</li></ol>')
    writeFileInPad(folder, 'pages/index.md', ':::html file=custom/retry-steps.html\n:::\n')

    expect(viewPage(folder, 'index').html).toContain('<ol><li>Retry the export.</li></ol>')
  })

  it('returns the answer of each decision when Nick has answered the question of that decision', () => {
    const folder = folderWithDecisions()
    nickAnswersRetryQuestion(folder)

    expect(
      viewPage(folder, 'pages/invoice-decisions.md').decisions.map((decision) => ({
        id: decision.id,
        question: decision.question,
        answer: decision.answer,
      })),
    ).toStrictEqual([
      { id: 'd-1', question: retryQuestion, answer: { choice: 'proposal' } },
      { id: 'd-2', question: taxQuestion, answer: undefined },
    ])
  })

  it('returns the answer on the decision with the same id when the agent has changed the heading above the decision', () => {
    const folder = folderWithDecisions()
    nickAnswersRetryQuestion(folder)
    writeFileInPad(
      folder,
      'pages/invoice-decisions.md',
      '## Will the export job retry 10 times?\n\n:::decision d-1\nproposal: a\nalternative: b\npick: a\n:::\n',
    )

    expect(viewPage(folder, 'pages/invoice-decisions.md').decisions[0]?.answer).toStrictEqual({
      choice: 'proposal',
    })
  })

  it('returns the answer only on the answered decision when 2 decisions are under the same heading', () => {
    const folder = exportJobScratchPad(temporaryHome())
    writeRetryChoicesPage(folder)
    nickAnswersDecision(folder, {
      id: 'd-3',
      page: 'pages/retry-choices.md',
      line: 5,
      question: retryQuestion,
      answer: { choice: 'alternative' },
    })

    expect(
      viewPage(folder, 'retry-choices').decisions.map((decision) => [decision.id, decision.answer]),
    ).toStrictEqual([
      ['d-3', { choice: 'alternative' }],
      ['d-4', undefined],
    ])
  })

  it('throws UnknownPageError when the page does not exist', () => {
    const view = () => viewPage(exportJobScratchPad(temporaryHome()), 'queue')

    expect(view).toThrow(UnknownPageError)
    expect(view).toThrow("There isn't any page called queue in 2026-03-14-export-job.")
  })
})

describe('threadsOfPage', () => {
  it('returns the open and the resolved threads of the page when other pages have threads too', () => {
    const folder = folderWithDecisions()
    commentOnRetryPolicy(folder, 'Is 5 retries enough?')
    commentOnRetryPolicy(folder, 'Is 30 seconds enough?')
    nickResolves(folder, 'c-2')
    nickComments(folder, {
      type: 'improvement',
      page: 'pages/invoice-decisions.md',
      anchor: undefined,
      text: 'Add an example.',
    })

    expect(
      threadsOfPage(folder, 'index').map((thread) => [thread.id, thread.waitsFor]),
    ).toStrictEqual([
      ['c-1', 'agent'],
      ['c-2', 'nobody'],
    ])
  })
})

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
      { page: 'pages/invoice-decisions.md', id: 'd-2', line: 13, question: taxQuestion },
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

    expect(nickInboxItems(folder).decisions).toStrictEqual([
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

describe('progressTrackerOf', () => {
  it('returns the title, the goal and the tasks of the progress tracker', () => {
    const folder = exportJobScratchPad(temporaryHome())
    addTaskToTracker(folder, 'Export the invoices')

    expect(progressTrackerOf(folder)).toStrictEqual({
      title: 'Export job',
      goal: undefined,
      tasks: [{ number: 1, title: 'Export the invoices', state: 'to-do' }],
    })
  })
})

describe('decisionLogOf', () => {
  it('returns the decisions from the chat and from the pages in the order they were logged', () => {
    const folder = folderWithDecisions()
    logDecisionFromChat(folder, 'The export job runs every night.', unservedLinks)
    nickAnswersRetryQuestion(folder)

    expect(decisionLogOf(folder)).toStrictEqual([
      {
        number: 1,
        time,
        source: 'chat',
        text: 'The export job runs every night.',
        decision: undefined,
      },
      {
        number: 2,
        time,
        source: 'page',
        text: `${retryQuestion} Nick chose: proposal`,
        decision: 'd-1',
      },
    ])
  })
})
