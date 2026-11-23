import { mkdirSync, renameSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { replyToThread } from '../agent-commands/thread-commands'
import { logDecisionFromChat } from '../agent-commands/decision-log-commands'
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
import { decisionLogOf, pageSummaries, threadsOfPage, viewPage } from './nick-views'

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
  it('gives a sub page the parent whose number has a leading zero', () => {
    const folder = exportJobScratchPad(temporaryHome())
    writeFileInPad(folder, 'pages/01-m.md', '# M\n')
    writeFileInPad(folder, 'pages/1.1-y.md', '# Y\n')

    expect(
      pageSummaries(folder).map((summary) => [summary.file, summary.number, summary.parent]),
    ).toStrictEqual([
      ['pages/index.md', undefined, undefined],
      ['pages/01-m.md', '1', undefined],
      ['pages/1.1-y.md', '1.1', 'pages/m.md'],
    ])
  })

  it('returns each page with its title, its open threads and its headings at the levels that the browser shows when Nick has commented', () => {
    const folder = exportJobScratchPad(temporaryHome())
    commentOnRetryPolicy(folder, 'Is 5 retries enough?')

    expect(pageSummaries(folder)).toStrictEqual([
      {
        page: 'pages/index.md',
        file: 'pages/index.md',
        number: undefined,
        parent: undefined,
        title: 'Export job',
        description: undefined,
        headings: [
          { level: 1, text: 'Export job', id: 'export-job', line: 1 },
          { level: 3, text: 'Retry policy', id: 'retry-policy', line: 3 },
        ],
        openThreads: 1,
        waitingForNick: { decisions: 0, replies: 0 },
        waitingForNickWithSubPages: { decisions: 0, replies: 0 },
      },
    ])
  })

  it('returns the pages in the order of their numbers with their numbers, their parents and what waits for Nick on them and on their sub pages', () => {
    const folder = numberedScratchPad()
    const anchor = { firstLine: 3, lastLine: 3, selectedText: 'Raw logs', prefix: '', suffix: '' }
    nickComments(folder, { type: 'comment', page: 'raw-logs', anchor, text: 'Which day?' })
    replyToThread(folder, 'c-1', 'Monday.', unservedLinks)

    expect(
      pageSummaries(folder).map((summary) => ({
        file: summary.file,
        page: summary.page,
        number: summary.number,
        parent: summary.parent,
        own: summary.waitingForNick,
        withSubPages: summary.waitingForNickWithSubPages,
      })),
    ).toStrictEqual([
      {
        file: 'pages/index.md',
        page: 'pages/index.md',
        number: undefined,
        parent: undefined,
        own: { decisions: 0, replies: 0 },
        withSubPages: { decisions: 0, replies: 0 },
      },
      {
        file: 'pages/1-comment-on-the-export.md',
        page: 'pages/comment-on-the-export.md',
        number: '1',
        parent: undefined,
        own: { decisions: 0, replies: 0 },
        withSubPages: { decisions: 1, replies: 1 },
      },
      {
        file: 'pages/1.1-evidence.md',
        page: 'pages/evidence.md',
        number: '1.1',
        parent: 'pages/comment-on-the-export.md',
        own: { decisions: 1, replies: 0 },
        withSubPages: { decisions: 1, replies: 1 },
      },
      {
        file: 'pages/1.1.1-raw-logs.md',
        page: 'pages/raw-logs.md',
        number: '1.1.1',
        parent: 'pages/evidence.md',
        own: { decisions: 0, replies: 1 },
        withSubPages: { decisions: 0, replies: 1 },
      },
      {
        file: 'pages/2-board-edge.md',
        page: 'pages/board-edge.md',
        number: '2',
        parent: undefined,
        own: { decisions: 0, replies: 0 },
        withSubPages: { decisions: 0, replies: 0 },
      },
      {
        file: 'pages/notes.md',
        page: 'pages/notes.md',
        number: undefined,
        parent: undefined,
        own: { decisions: 0, replies: 0 },
        withSubPages: { decisions: 0, replies: 0 },
      },
    ])
  })

  it('returns the first sentence after the title of each page as its description', () => {
    expect(pageSummaries(numberedScratchPad()).map((summary) => summary.description)).toStrictEqual(
      [
        undefined,
        'Nick commented on the export of the invoices.',
        'The logs show 3 failed exports.',
        undefined,
        undefined,
        undefined,
      ],
    )
  })

  it('lists a duplicate page once and leaves out the parent of a sub page whose parent number does not exist', () => {
    const folder = exportJobScratchPad(temporaryHome())
    writeFileInPad(folder, 'pages/1-evidence.md', '# Evidence\n')
    writeFileInPad(folder, 'pages/2-evidence.md', '# Evidence again\n')
    writeFileInPad(folder, 'pages/3.1-orphan.md', '# Orphan\n')

    expect(
      pageSummaries(folder).map((summary) => [summary.file, summary.title, summary.parent]),
    ).toStrictEqual([
      ['pages/index.md', 'Export job', undefined],
      ['pages/1-evidence.md', 'Evidence', undefined],
      ['pages/3.1-orphan.md', 'Orphan', undefined],
    ])
  })
})

function numberedScratchPad(): ScratchPadFolder {
  const folder = exportJobScratchPad(temporaryHome())
  writeFileInPad(
    folder,
    'pages/1-comment-on-the-export.md',
    '# Comment on the export\n\nNick commented on the export of the invoices. The agent replied.\n',
  )
  writeFileInPad(
    folder,
    'pages/1.1-evidence.md',
    [
      '# Evidence',
      '',
      'The logs show 3 failed exports.',
      '',
      '## Will the export job retry 8 times?',
      '',
      ':::decision d-1',
      'proposal: Raise the retry limit to 8.',
      'alternative: Keep the retry limit at 5.',
      'pick: proposal',
      ':::',
      '',
    ].join('\n'),
  )
  writeFileInPad(folder, 'pages/1.1.1-raw-logs.md', '# Raw logs\n\n## Raw logs\n')
  writeFileInPad(folder, 'pages/2-board-edge.md', '# Board edge\n')
  writeFileInPad(folder, 'pages/notes.md', '# Notes\n')
  return folder
}

describe('viewPage', () => {
  it('returns the index page with the title, the introduction and the table of contents when Nick opens the index page', () => {
    const page = viewPage(exportJobScratchPad(temporaryHome()), 'index')

    expect({ ...page, html: page.html.split('\n').slice(0, 3) }).toStrictEqual({
      page: 'pages/index.md',
      title: 'Export job',
      html: [
        '<h1 data-lines="1-1" id="export-job">Export job</h1>',
        '<h2 id="introduction">Introduction</h2>',
        '<h3 data-lines="3-3" id="retry-policy">Retry policy</h3>',
      ],
      headings: [
        { level: 1, text: 'Export job', id: 'export-job', line: 1 },
        { level: 2, text: 'Introduction', id: 'introduction', line: 2 },
        { level: 3, text: 'Retry policy', id: 'retry-policy', line: 3 },
        { level: 2, text: 'Table of contents', id: 'table-of-contents', line: 8 },
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

  it('returns the thread on its text when the agent has changed the number of the page', () => {
    const folder = numberedScratchPad()
    const anchor = { firstLine: 1, lastLine: 1, selectedText: 'Board edge', prefix: '', suffix: '' }
    nickComments(folder, { type: 'comment', page: '2-board-edge.md', anchor, text: 'Why?' })
    renameSync(
      join(folder.path, 'pages/2-board-edge.md'),
      join(folder.path, 'pages/3-board-edge.md'),
    )

    expect(
      threadsOfPage(folder, 'board-edge.md').map((thread) => [thread.page, thread.position?.kind]),
    ).toStrictEqual([['pages/board-edge.md', 'attached']])
  })

  it('returns the threads of a page that the agent has deleted, without a position on the page', () => {
    const folder = numberedScratchPad()
    const anchor = { firstLine: 1, lastLine: 1, selectedText: 'Board edge', prefix: '', suffix: '' }
    nickComments(folder, { type: 'comment', page: '2-board-edge.md', anchor, text: 'Why?' })
    rmSync(join(folder.path, 'pages/2-board-edge.md'))

    expect(
      threadsOfPage(folder, 'board-edge.md').map((thread) => [thread.id, thread.position?.kind]),
    ).toStrictEqual([['c-1', 'detached']])
    expect(threadsOfPage(folder, 'queue.md')).toStrictEqual([])
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
