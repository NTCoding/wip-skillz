import { rmSync } from 'node:fs'
import { afterEach, describe, expect, it } from 'vitest'
import { readyDecisionPages } from '../decision-pages/ready-decision-pages'
import { decisionPageTemplate } from '../decision-pages/decision-page'
import { finishedDecisionPage, readyEvent } from '../decision-pages/decision-page-fixtures'
import { exportJobAddress, servedLinks } from '../item-links/item-links-fixtures'
import { UnknownPageError } from '../pages/page-markdown'
import { DecisionDoneError } from '../decisions/decision-review'
import { nickAnswersDecision, nickRequestsChanges } from '../nick-actions/nick-actions'
import {
  exportJobScratchPad,
  removeTemporaryHomes,
  temporaryHome,
  writeFileInPad,
} from '../scratch-pad-folder/scratch-pad-folder-fixtures'
import { type ScratchPadFolder } from '../scratch-pad-folder/scratch-pad-folder'
import { mainAgentTypes } from '../agent-inbox/agent-inbox'
import {
  brokenDecisionPageLines,
  createPage,
  makeDecisionPageReady,
  PageContentError,
  InvalidPageNameError,
  nextDecisionId,
  PageNameTakenError,
  UnknownPageTypeError,
  UnnumberedParentError,
} from './decision-page-commands'
import { readAgentInbox } from './inbox-commands'
import { finishItem, reopenItem, showItem } from './thread-commands'

afterEach(() => {
  removeTemporaryHomes()
})

function folderWithPages(files: Readonly<Record<string, string>> = {}): ScratchPadFolder {
  const folder = exportJobScratchPad(temporaryHome())
  Object.entries({
    'pages/1-how-the-job-runs.md': '# How the job runs\n',
    'pages/2-retry-limit.md': '# Retry limit\n',
    'pages/2.1-wait.md': '# Wait\n',
    ...files,
  }).forEach(([file, text]) => writeFileInPad(folder, file, text))
  return folder
}

const usage = 'page <parent> <file-name> [--type=decision]'

function create(folder: ScratchPadFolder, ...words: string[]): string {
  return createPage(folder, { words, type: 'decision', usage }, servedLinks)
}

describe('createPage', () => {
  it('writes the template with the next free id as the next sub page of a numbered page', () => {
    const folder = folderWithPages()

    expect(create(folder, 'retry-limit', 'retry-wait.md')).toBe(
      [
        `created ${folder.path}/pages/2.2-retry-wait.md (decision d-1, a draft sub page of pages/2-retry-limit.md)`,
        'Write the content of the page. Run ready d-1 to make the page ready for Nick.',
        `link: ${exportJobAddress}retry-wait.md#d-1`,
      ].join('\n'),
    )
    expect(folder.readPageLines('pages/retry-wait.md').join('\n')).toBe(decisionPageTemplate('d-1'))
  })

  it('writes a page at the top level when the parent is the index page', () => {
    const folder = folderWithPages()

    create(folder, 'index', 'storage')

    expect(folder.pageFiles().map((file) => file.file)).toContain('pages/3-storage.md')
  })

  it('numbers the first sub page of a page without any sub pages as 1', () => {
    const folder = folderWithPages()

    create(folder, 'how-the-job-runs', 'steps')

    expect(folder.pageFiles().map((file) => file.file)).toContain('pages/1.1-steps.md')
  })

  it('writes the first page of a scratch pad that only has the index page as page 1', () => {
    const folder = exportJobScratchPad(temporaryHome())

    create(folder, 'index', 'first')

    expect(folder.pageFiles().map((file) => file.file)).toContain('pages/1-first.md')
  })

  it('takes the next id after every id that is already used on a page, in an answer, a review or the log', () => {
    const folder = folderWithPages({
      'pages/1-how-the-job-runs.md':
        '# How the job runs\n\n## Retry\n\n:::decision d-3\nproposal: A\nalternative: B\npick: proposal\n:::\n',
      'pages/2.1-wait.md': decisionPageTemplate('d-6'),
    })
    folder.change((pad) => {
      pad.saveDecisionLogEntry({
        number: 1,
        time: '2026-03-14T09:30:00.000Z',
        source: 'chat',
        text: 'Decided in the chat.',
        decision: 'd-8',
      })
      pad.saveDecisionLogEntry({
        number: 2,
        time: '2026-03-14T09:30:00.000Z',
        source: 'chat',
        text: 'Decided without an id.',
        decision: undefined,
      })
    })
    nickAnswersDecision(folder, {
      id: 'd-7',
      page: 'how-the-job-runs',
      line: 5,
      question: 'Retry?',
      answer: { choice: 'proposal' },
    })
    nickRequestsChanges(folder, {
      id: 'd-9',
      page: 'how-the-job-runs',
      line: 5,
      question: 'Retry?',
      reason: 'Why?',
    })

    expect(nextDecisionId(folder)).toBe('d-10')
  })

  it('takes the next id after the id of any event and ignores an event without an id', () => {
    const folder = folderWithPages()
    folder.change((pad) => {
      pad.appendEvent({ ...readyEvent('d-12'), kind: 'decision-asked' })
      pad.appendEvent({ ...readyEvent('d-3'), kind: 'item-queued', item: undefined })
    })

    expect(nextDecisionId(folder)).toBe('d-13')
  })

  it.each([['a b'], ['a/b'], ['.md'], ['-a'], ['']])('throws for "%s" as a file name', (name) => {
    expect(() => create(folderWithPages(), 'index', name)).toThrow(InvalidPageNameError)
  })

  it('throws when another page has the name after its number', () => {
    expect(() => create(folderWithPages(), 'index', 'wait')).toThrow(PageNameTakenError)
    expect(() => create(folderWithPages(), 'index', 'wait')).toThrow(
      'pages/2.1-wait.md already has the name wait.md. Give the page another name.',
    )
  })

  it('throws when the parent page has no number', () => {
    const folder = folderWithPages({ 'pages/notes.md': '# Notes\n' })

    expect(() => create(folder, 'notes', 'idea')).toThrow(UnnumberedParentError)
  })

  it('throws when the parent page is missing', () => {
    expect(() => create(folderWithPages(), 'missing', 'idea')).toThrow(UnknownPageError)
  })

  it.each([[[]], [['index']], [['index', 'idea', 'a title']]])(
    'throws for the words %j because the command takes no content',
    (words) => {
      expect(() => create(folderWithPages(), ...words)).toThrow(PageContentError)
    },
  )

  it('writes a blank sub page with the right number when the type is missing', () => {
    const folder = folderWithPages()
    const request = { words: ['retry-limit', 'notes.md'], type: undefined, usage }

    expect(createPage(folder, request, servedLinks)).toBe(
      [
        `created ${folder.path}/pages/2.2-notes.md (a sub page of pages/2-retry-limit.md)`,
        'Write the content of the page.',
        `link: ${exportJobAddress}notes.md`,
      ].join('\n'),
    )
    expect(folder.readPageLines('pages/notes.md')).toStrictEqual([''])
  })

  it('doesn’t reuse the id of a ready page that was deleted', () => {
    const folder = folderWithPages({ 'pages/2.2-idea.md': finishedDecisionPage('d-10') })
    makeDecisionPageReady(folder, 'd-10', servedLinks)
    rmSync(`${folder.path}/pages/2.2-idea.md`)
    create(folder, 'index', 'again')

    expect(folder.readPageLines('pages/again.md').join('\n')).toBe(decisionPageTemplate('d-11'))
    expect(readyDecisionPages(folder).has('d-11')).toBe(false)
  })

  it('throws and lists the types when the type is unknown', () => {
    const request = { words: ['index', 'idea'], type: 'survey', usage }

    expect(() => createPage(folderWithPages(), request, servedLinks)).toThrow(UnknownPageTypeError)
    expect(() => createPage(folderWithPages(), request, servedLinks)).toThrow(
      '"survey" isn\'t a type of page. The types are decision.',
    )
  })
})

describe('a decision page and the commands for a decision', () => {
  const question = 'How long should a retry wait?'

  it('works with show, reopen and done in the same way as an inline decision', () => {
    const folder = folderWithPages({ 'pages/3-idea.md': finishedDecisionPage('d-1') })
    nickRequestsChanges(folder, {
      id: 'd-1',
      page: 'idea',
      line: 4,
      question,
      reason: 'Show the cost of each option.',
    })

    expect(showItem(folder, 'd-1', servedLinks)).toBe(
      [
        `[d-1] decision · pages/3-idea.md:4 · "${question}" · changes requested`,
        `  link: ${exportJobAddress}idea.md#d-1`,
        '  1. Nick requested changes: Show the cost of each option.',
      ].join('\n'),
    )
    expect(() => finishItem(folder, 'd-1', 'Done.', servedLinks)).toThrow(DecisionDoneError)
    expect(reopenItem(folder, 'd-1', 'Added the cost.', servedLinks)).toBe(
      `d-1 is open again\nlink: ${exportJobAddress}idea.md#d-1`,
    )

    nickAnswersDecision(folder, {
      id: 'd-1',
      page: 'idea',
      line: 4,
      question,
      answer: { choice: 'option-2' },
    })

    expect(finishItem(folder, 'd-1', 'Changed the wait.', servedLinks)).toBe(
      `d-1 is done\nlink: ${exportJobAddress}idea.md#d-1`,
    )
  })
})

describe('brokenDecisionPageLines', () => {
  it('lists the file and the line of each problem of a broken decision page', () => {
    const folder = folderWithPages({ 'pages/2.2-idea.md': decisionPageTemplate('d-1') })
    folder.change((pad) => pad.appendEvent(readyEvent('d-1')))

    expect(brokenDecisionPageLines(folder).slice(0, 4)).toStrictEqual([
      '',
      "pages/2.2-idea.md is a broken decision page. Nick can still decide d-1, but the page doesn't match the template. Fix these problems:",
      '  pages/2.2-idea.md:4 the page has fewer than 2 options. A decision needs at least 2 options',
      '  pages/2.2-idea.md:4 the page still has the placeholder <title> from the template. Replace the placeholder with real content',
    ])
  })

  it('lists no line for a finished decision page', () => {
    const folder = folderWithPages({ 'pages/2.2-idea.md': finishedDecisionPage('d-1') })

    expect(brokenDecisionPageLines(folder)).toStrictEqual([])
  })
})

describe('the agent inbox with a broken decision page', () => {
  it('prints the problems under the items and doesn’t list the decision', () => {
    const folder = folderWithPages({ 'pages/2.2-idea.md': decisionPageTemplate('d-1') })
    folder.change((pad) => pad.appendEvent(readyEvent('d-1')))

    const printed = readAgentInbox(
      folder,
      { types: mainAgentTypes, includeSeen: false },
      servedLinks,
    )

    expect(printed).toContain('pages/2.2-idea.md is a broken decision page.')
    expect(printed).not.toContain('[d-1]')
  })
})
