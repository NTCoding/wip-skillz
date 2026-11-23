import { afterEach, describe, expect, it } from 'vitest'
import {
  exportJobScratchPad,
  freezeClockAt,
  removeTemporaryHomes,
  temporaryHome,
} from '../scratch-pad-folder/scratch-pad-folder-fixtures'
import { writeInvoiceDecisionsPage } from '../nick-views/nick-views-fixtures'
import {
  exportJobAddress,
  missingLinksText,
  servedLinks,
  unservedLinks,
} from '../item-links/item-links-fixtures'
import { nickFinishesTask } from '../nick-actions/nick-actions'
import { trackerWithSubtasks } from '../progress-tracker/progress-tracker-fixtures'
import { assignSubtask } from '../progress-tracker/task-assignments'
import { type ScratchPadFolder } from '../scratch-pad-folder/scratch-pad-folder'
import { commentAndGrammarNoteAndDecision } from './agent-commands-fixtures'
import { readAgentInbox, scratchPadStatus } from './inbox-commands'

const mainTypes = { types: ['comment', 'decision'] as const, includeSeen: false }

freezeClockAt('2026-03-14T09:30:00.000Z')

// Subtask 2.1 is in progress and subtask 2.2 is to do. Both are assigned to Nick.
function assignedSubtasks(folder: ScratchPadFolder): void {
  const assignment = { do: 'Ask the bank for the IBAN of the shop', why: "The agent can't call" }
  const first = assignSubtask(
    trackerWithSubtasks(['in-progress', 'to-do']),
    { task: 2, subtask: 1 },
    assignment,
  )
  const both = assignSubtask(first.tracker, { task: 2, subtask: 2 }, assignment)
  folder.change((pad) => pad.writeProgressTracker(both.tracker))
}

afterEach(() => {
  removeTemporaryHomes()
})

describe('readAgentInbox', () => {
  it('prints the new comments and decisions with the Markdown of each block', () => {
    const folder = exportJobScratchPad(temporaryHome())
    commentAndGrammarNoteAndDecision(folder)

    expect(readAgentInbox(folder, mainTypes, servedLinks)).toBe(
      [
        '2 new items in 2026-03-14-export-job',
        '',
        '[c-1] comment · pages/index.md:5-6 · section "Retry policy"',
        `  link: ${exportJobAddress}#c-1`,
        '  selected: "The export job retries 5 times."',
        '  Nick: Is 5 retries enough on a slow network?',
        '  block:',
        '    5 | The export job retries 5 times.',
        '    6 | Each retry waits 30 seconds.',
        '',
        '[d-1] decision · pages/index.md:9 · "Will the invoice template show the tax number?"',
        `  link: ${exportJobAddress}#d-1`,
        '  Nick chose: proposal',
        '',
        '1 grammar note waits for a subagent',
      ].join('\n'),
    )
  })

  it('prints nothing new the second time because printing records the items as seen', () => {
    const folder = exportJobScratchPad(temporaryHome())
    commentAndGrammarNoteAndDecision(folder)
    readAgentInbox(folder, mainTypes, servedLinks)

    expect(readAgentInbox(folder, mainTypes, servedLinks).split('\n')[0]).toBe(
      'nothing new in 2026-03-14-export-job · 2 items printed before (scratch-pad inbox --pad 2026-03-14-export-job --all)',
    )
  })

  it('keeps the grammar notes new for the subagent after the main agent has read its inbox', () => {
    const folder = exportJobScratchPad(temporaryHome())
    commentAndGrammarNoteAndDecision(folder)
    readAgentInbox(folder, mainTypes, servedLinks)

    expect(
      readAgentInbox(
        folder,
        { types: ['grammar', 'improvement'], includeSeen: false },
        servedLinks,
      ).split('\n')[0],
    ).toBe('1 new item in 2026-03-14-export-job')
  })

  it('prints the seen comment and the seen decision again when seen items are included', () => {
    const folder = exportJobScratchPad(temporaryHome())
    commentAndGrammarNoteAndDecision(folder)
    readAgentInbox(folder, mainTypes, servedLinks)

    expect(
      readAgentInbox(folder, { ...mainTypes, includeSeen: true }, servedLinks).split('\n')[0],
    ).toBe('2 items wait for the agent in 2026-03-14-export-job')
  })

  it('prints a subtask once after Nick has marked it as done in the browser with the subtask that was started', () => {
    const folder = exportJobScratchPad(temporaryHome())
    assignedSubtasks(folder)
    nickFinishesTask(folder, 't-4')

    expect([
      readAgentInbox(folder, mainTypes, servedLinks),
      readAgentInbox(folder, mainTypes, servedLinks),
    ]).toStrictEqual([
      [
        '1 new item in 2026-03-14-export-job',
        '',
        '[t-4] subtask 2.1 is done: Retry a failed export',
        `  link: ${exportJobAddress}progress-tracker#t-4`,
        '  Nick marked it as done in the browser.',
        '  [t-1] task 1 has started: Task about retry 1',
      ].join('\n'),
      'nothing new in 2026-03-14-export-job',
    ])
  })

  it("prints that there aren't any links at the end when the server isn't running", () => {
    const folder = exportJobScratchPad(temporaryHome())
    commentAndGrammarNoteAndDecision(folder)

    expect(readAgentInbox(folder, mainTypes, unservedLinks).split('\n').slice(-3)).toStrictEqual([
      '1 grammar note waits for a subagent',
      '',
      missingLinksText,
    ])
  })
})

describe('scratchPadStatus', () => {
  it('prints the scratch pad, the current task and the counts of both inboxes', () => {
    const folder = exportJobScratchPad(temporaryHome())
    commentAndGrammarNoteAndDecision(folder)

    expect(scratchPadStatus(folder, unservedLinks)).toBe(
      [
        `2026-03-14-export-job · ${folder.path}`,
        missingLinksText,
        'no tasks yet',
        'waiting for the agent: 1 comment, 1 decision, 1 grammar note',
        'waiting for Nick: nothing',
      ].join('\n'),
    )
  })

  it('counts the decision blocks that Nick has not answered when a page has an open decision', () => {
    const folder = exportJobScratchPad(temporaryHome())
    writeInvoiceDecisionsPage(folder)

    expect(scratchPadStatus(folder, servedLinks).split('\n')[5]).toBe(
      'waiting for Nick: 2 decisions',
    )
  })

  it('counts the tasks that are assigned to Nick and are not done yet', () => {
    const folder = exportJobScratchPad(temporaryHome())
    assignedSubtasks(folder)
    nickFinishesTask(folder, 't-4')

    expect(scratchPadStatus(folder, unservedLinks).split('\n').at(-1)).toBe(
      'waiting for Nick: 1 task',
    )
  })

  it('counts a subtask that Nick has done as waiting for the agent until inbox has printed it', () => {
    const folder = exportJobScratchPad(temporaryHome())
    assignedSubtasks(folder)
    nickFinishesTask(folder, 't-4')
    const before = scratchPadStatus(folder, unservedLinks).split('\n').at(-2)
    readAgentInbox(folder, mainTypes, servedLinks)

    expect([before, scratchPadStatus(folder, unservedLinks).split('\n').at(-2)]).toStrictEqual([
      'waiting for the agent: 1 task',
      'waiting for the agent: nothing',
    ])
  })
})
