import { afterEach, describe, expect, it } from 'vitest'
import {
  exportJobScratchPad,
  freezeClockAt,
  removeTemporaryHomes,
  temporaryHome,
} from '../scratch-pad-folder/scratch-pad-folder-fixtures'
import { writeInvoiceDecisionsPage } from '../nick-views/nick-views-fixtures'
import { commentAndGrammarNoteAndDecision } from './agent-commands-fixtures'
import { readAgentInbox, scratchPadStatus } from './inbox-commands'

const mainTypes = { types: ['comment', 'decision'] as const, includeSeen: false }

freezeClockAt('2026-03-14T09:30:00.000Z')

afterEach(() => {
  removeTemporaryHomes()
})

describe('readAgentInbox', () => {
  it('prints the new comments and decisions with the Markdown of each block', () => {
    const folder = exportJobScratchPad(temporaryHome())
    commentAndGrammarNoteAndDecision(folder)

    expect(readAgentInbox(folder, mainTypes)).toBe(
      [
        '2 new items in 2026-03-14-export-job',
        '',
        '[c-1] comment · pages/index.md:5-6 · section "Retry policy"',
        '  selected: "The export job retries 5 times."',
        '  Nick: Is 5 retries enough on a slow network?',
        '  block:',
        '    5 | The export job retries 5 times.',
        '    6 | Each retry waits 30 seconds.',
        '',
        '[d-1] decision · pages/index.md:9 · "Will the invoice template show the tax number?"',
        '  Nick chose: proposal',
        '',
        '1 grammar note waits for a subagent',
      ].join('\n'),
    )
  })

  it('prints nothing new the second time because printing records the items as seen', () => {
    const folder = exportJobScratchPad(temporaryHome())
    commentAndGrammarNoteAndDecision(folder)
    readAgentInbox(folder, mainTypes)

    expect(readAgentInbox(folder, mainTypes).split('\n')[0]).toBe(
      'nothing new in 2026-03-14-export-job · 2 items printed before (scratch-pad inbox --pad 2026-03-14-export-job --all)',
    )
  })

  it('keeps the grammar notes new for the subagent after the main agent has read its inbox', () => {
    const folder = exportJobScratchPad(temporaryHome())
    commentAndGrammarNoteAndDecision(folder)
    readAgentInbox(folder, mainTypes)

    expect(
      readAgentInbox(folder, { types: ['grammar', 'improvement'], includeSeen: false }).split(
        '\n',
      )[0],
    ).toBe('1 new item in 2026-03-14-export-job')
  })

  it('prints the seen comment and the seen decision again when seen items are included', () => {
    const folder = exportJobScratchPad(temporaryHome())
    commentAndGrammarNoteAndDecision(folder)
    readAgentInbox(folder, mainTypes)

    expect(readAgentInbox(folder, { ...mainTypes, includeSeen: true }).split('\n')[0]).toBe(
      '2 items wait for the agent in 2026-03-14-export-job',
    )
  })
})

describe('scratchPadStatus', () => {
  it('prints the scratch pad, the current task and the counts of both inboxes', () => {
    const folder = exportJobScratchPad(temporaryHome())
    commentAndGrammarNoteAndDecision(folder)

    expect(scratchPadStatus(folder, undefined)).toBe(
      [
        `2026-03-14-export-job · ${folder.path}`,
        'no tasks yet',
        'waiting for the agent: 1 comment, 1 decision, 1 grammar note',
        'waiting for Nick: nothing',
      ].join('\n'),
    )
  })

  it('counts the decision blocks that Nick has not answered when a page has an open decision', () => {
    const folder = exportJobScratchPad(temporaryHome())
    writeInvoiceDecisionsPage(folder)

    expect(scratchPadStatus(folder, undefined).split('\n')[3]).toBe('waiting for Nick: 2 decisions')
  })
})
