import { afterEach, describe, expect, it } from 'vitest'
import { decisionPageTemplate } from '../decision-pages/decision-page'
import { finishedDecisionPage } from '../decision-pages/decision-page-fixtures'
import { servedLinks } from '../item-links/item-links-fixtures'
import { nickAnswersDecision, nickRequestsChanges } from '../nick-actions/nick-actions'
import { type ScratchPadFolder } from '../scratch-pad-folder/scratch-pad-folder'
import {
  exportJobScratchPad,
  removeTemporaryHomes,
  temporaryHome,
  writeFileInPad,
} from '../scratch-pad-folder/scratch-pad-folder-fixtures'
import { brokenDecisionPageLines, makeDecisionPageReady } from './decision-page-commands'
import { reopenItem } from './thread-commands'
import { waitForAgentInbox, type WaitRequest } from './wait-commands'

afterEach(() => {
  removeTemporaryHomes()
})

const question = 'How long should a retry wait?'
const file = 'pages/1.1-idea.md'

// A decision page that the agent has made ready
function folderWithReadyPage(): ScratchPadFolder {
  const folder = exportJobScratchPad(temporaryHome())
  writeFileInPad(folder, 'pages/1-first.md', '# First\n')
  writeFileInPad(folder, file, finishedDecisionPage('d-1'))
  makeDecisionPageReady(folder, 'd-1', servedLinks)
  return folder
}

// The agent renames the heading of Option 2, which leaves the page with one option
function breakPage(folder: ScratchPadFolder): void {
  writeFileInPad(
    folder,
    file,
    finishedDecisionPage('d-1').replace('### Option 2: Double the wait', '### Second idea'),
  )
}

function nickDecides(folder: ScratchPadFolder): void {
  nickAnswersDecision(folder, {
    id: 'd-1',
    page: 'idea',
    line: 4,
    question,
    answer: { choice: 'option-1' },
  })
}

function nickSendsBack(folder: ScratchPadFolder): void {
  nickRequestsChanges(folder, {
    id: 'd-1',
    page: 'idea',
    line: 4,
    question,
    reason: 'Show the cost of each option.',
  })
}

describe('the lines about a decision page that was ready and is broken now', () => {
  it('state that Nick can still decide the page when the decision is open', () => {
    const folder = folderWithReadyPage()
    breakPage(folder)

    expect(brokenDecisionPageLines(folder).slice(0, 2)).toStrictEqual([
      '',
      "pages/1.1-idea.md is a broken decision page. Nick can still decide d-1, but the page doesn't match the template. Fix these problems:",
    ])
  })

  it('state that the decision is kept when Nick has decided', () => {
    const folder = folderWithReadyPage()
    nickDecides(folder)
    breakPage(folder)

    expect(brokenDecisionPageLines(folder)[1]).toBe(
      "pages/1.1-idea.md is a broken decision page. Nick has decided d-1 and his decision is kept, but the page doesn't match the template. Fix these problems:",
    )
  })

  it('state that Nick asked for changes when the decision is sent back', () => {
    const folder = folderWithReadyPage()
    nickSendsBack(folder)
    breakPage(folder)

    expect(brokenDecisionPageLines(folder)[1]).toBe(
      "pages/1.1-idea.md is a broken decision page. Nick asked for changes to d-1 and the page doesn't match the template. Fix these problems together with the changes:",
    )
  })

  it('are empty after the agent fixes the page', () => {
    const folder = folderWithReadyPage()
    breakPage(folder)
    writeFileInPad(folder, file, finishedDecisionPage('d-1'))

    expect(brokenDecisionPageLines(folder)).toStrictEqual([])
  })
})

describe('reopen on a decision page that is broken', () => {
  it('reopens the decision and prints the problems of the page', () => {
    const folder = folderWithReadyPage()
    nickSendsBack(folder)
    breakPage(folder)

    const printed = reopenItem(folder, 'd-1', 'Added the cost.', servedLinks).split('\n')

    expect(printed[0]).toBe('d-1 is open again')
    expect(printed[2]).toBe(
      "pages/1.1-idea.md is a broken decision page. Nick can still decide d-1, but the page doesn't match the template. Fix these problems:",
    )
  })

  it('prints only the result when the page doesn’t have a problem', () => {
    const folder = folderWithReadyPage()
    nickSendsBack(folder)

    expect(reopenItem(folder, 'd-1', 'Added the cost.', servedLinks).split('\n')).toHaveLength(2)
  })
})

describe('wait with a decision page that breaks', () => {
  function waitRequest(changes: Partial<WaitRequest> = {}): WaitRequest {
    return {
      types: ['comment', 'decision'],
      quietMilliseconds: 0,
      timeoutMilliseconds: undefined,
      checkMilliseconds: 10,
      stopSignal: new AbortController().signal,
      links: () => Promise.resolve(servedLinks),
      ...changes,
    }
  }

  it('prints the problems when a ready page breaks while the agent waits', async () => {
    const folder = folderWithReadyPage()
    setTimeout(() => breakPage(folder), 50)

    const printed = await waitForAgentInbox(folder, waitRequest())

    expect(printed).toContain('nothing new in 2026-03-14-export-job')
    expect(printed).toContain('pages/1.1-idea.md is a broken decision page.')
  })

  it('stays quiet when the agent fixes the page while the agent waits', async () => {
    const folder = folderWithReadyPage()
    breakPage(folder)
    setTimeout(() => writeFileInPad(folder, file, finishedDecisionPage('d-1')), 50)

    await expect(
      waitForAgentInbox(folder, waitRequest({ timeoutMilliseconds: 300 })),
    ).resolves.toBe('the wait ended before a new item arrived in 2026-03-14-export-job')
  })

  it('prints the problems again when the problems of a broken page change', async () => {
    const folder = folderWithReadyPage()
    breakPage(folder)
    setTimeout(() => writeFileInPad(folder, file, decisionPageTemplate('d-1')), 50)

    await expect(waitForAgentInbox(folder, waitRequest())).resolves.toContain(
      'the page still has the placeholder <title> from the template',
    )
  })
})
