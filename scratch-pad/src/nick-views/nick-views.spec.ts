import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { replyToThread } from '../agent-commands/thread-commands'
import { logDecisionFromChat } from '../agent-commands/decision-log-commands'
import { addTaskToTracker } from '../agent-commands/progress-tracker-commands'
import { nickComments, nickResolves } from '../nick-actions/nick-actions'
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
} from './nick-views-fixtures'
import {
  decisionLogOf,
  nickInboxItems,
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
    replyToThread(folder, 'c-2', 'I have raised the wait to 60 seconds.')
    nickAnswersRetryQuestion(folder)

    const inbox = nickInboxItems(folder)

    expect(inbox.threads.map((thread) => thread.id)).toStrictEqual(['c-2'])
    expect(inbox.decisions).toStrictEqual([
      { page: 'pages/invoice-decisions.md', id: 'd-2', line: 13, question: taxQuestion },
    ])
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
    logDecisionFromChat(folder, 'The export job runs every night.')
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
