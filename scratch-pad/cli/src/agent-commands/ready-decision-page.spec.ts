import { afterEach, describe, expect, it } from 'vitest'
import { decisionPageTemplate } from '../decision-pages/decision-page'
import { finishedDecisionPage } from '../decision-pages/decision-page-fixtures'
import { InvalidDecisionIdError } from '../items/item-id'
import { exportJobAddress, servedLinks } from '../item-links/item-links-fixtures'
import { nickInboxItems } from '../nick-views/nick-views'
import {
  exportJobScratchPad,
  freezeClockAt,
  removeTemporaryHomes,
  temporaryHome,
  writeFileInPad,
} from '../scratch-pad-folder/scratch-pad-folder-fixtures'
import { type ScratchPadFolder } from '../scratch-pad-folder/scratch-pad-folder'
import {
  brokenDecisionPageLines,
  DecisionPageProblemsError,
  DecisionPageReadyError,
  makeDecisionPageReady,
  UnknownDecisionPageError,
} from './decision-page-commands'

const time = '2026-03-14T09:30:00.000Z'

freezeClockAt(time)

afterEach(() => {
  removeTemporaryHomes()
})

function folderWith(markdown: string): ScratchPadFolder {
  const folder = exportJobScratchPad(temporaryHome())
  writeFileInPad(folder, 'pages/1-first.md', '# First\n')
  writeFileInPad(folder, 'pages/1.1-idea.md', markdown)
  return folder
}

const ready = (folder: ScratchPadFolder, id = 'd-1') =>
  makeDecisionPageReady(folder, id, servedLinks)

const decisionIds = (folder: ScratchPadFolder) =>
  nickInboxItems(folder).decisions.map((decision) => decision.id)

describe('a draft decision page', () => {
  it('isn’t listed as waiting for Nick until the agent makes the decision ready', () => {
    const folder = folderWith(finishedDecisionPage('d-1'))

    expect(decisionIds(folder)).toStrictEqual([])

    ready(folder)

    expect(decisionIds(folder)).toStrictEqual(['d-1'])
  })

  it('isn’t reported as a broken page in the lines for inbox and wait', () => {
    expect(brokenDecisionPageLines(folderWith(decisionPageTemplate('d-1')))).toStrictEqual([])
  })
})

describe('makeDecisionPageReady', () => {
  it('makes the page ready, records a decision-ready event by the agent and prints the link', () => {
    const folder = folderWith(finishedDecisionPage('d-1'))

    expect(ready(folder)).toBe(
      `d-1 is ready. Nick can decide the decision page.\nlink: ${exportJobAddress}idea.md#d-1`,
    )
    expect(folder.read((pad) => pad.readEvents().at(-1))).toMatchObject({
      kind: 'decision-ready',
      by: 'agent',
      item: 'd-1',
    })
  })

  it('lists every problem with the file, the line and the heading when the template isn’t finished', () => {
    const folder = folderWith(decisionPageTemplate('d-1'))

    expect(() => ready(folder)).toThrow(DecisionPageProblemsError)
    expect(() => ready(folder)).toThrow(
      [
        "Decision d-1 isn't ready. Fix these problems and run ready d-1 again:",
        '  pages/1.1-idea.md:4 under "<title>": the page has fewer than 2 options. A decision needs at least 2 options',
        '  pages/1.1-idea.md:4 under "<title>": the page still has the placeholder <title> from the template. Replace the placeholder with real content',
        '  pages/1.1-idea.md:5 under "<title>": the page still has the placeholder <description> from the template. Replace the placeholder with real content',
        '  pages/1.1-idea.md:8 under "Context": the page still has the placeholder <the problem or goal, explained with examples> from the template. Replace the placeholder with real content',
        '  pages/1.1-idea.md:12 under "Options": the page still has the instruction line from the template. Delete the line',
        '  pages/1.1-idea.md:14 under "Option 1: <name>": the page still has the placeholder <name> from the template. Replace the placeholder with real content',
        '  pages/1.1-idea.md:15 under "Option 1: <name>": the page still has the placeholder <prose> from the template. Replace the placeholder with real content',
        '  pages/1.1-idea.md:18 under "Agent recommendation": the page still has the placeholder <which option and why> from the template. Replace the placeholder with real content',
      ].join('\n'),
    )
  })

  it('keeps the page a draft when the command fails', () => {
    const folder = folderWith(decisionPageTemplate('d-1'))

    expect(() => ready(folder)).toThrow(DecisionPageProblemsError)
    expect(folder.read((pad) => pad.readEvents().map((event) => event.kind))).not.toContain(
      'decision-ready',
    )
  })

  it('throws when the page is already ready', () => {
    const folder = folderWith(finishedDecisionPage('d-1'))
    ready(folder)

    expect(() => ready(folder)).toThrow(DecisionPageReadyError)
    expect(() => ready(folder)).toThrow('Decision d-1 is already ready.')
  })

  it('throws when the id isn’t the id of a decision page', () => {
    const folder = folderWith(finishedDecisionPage('d-1'))

    expect(() => ready(folder, 'd-9')).toThrow(UnknownDecisionPageError)
    expect(() => ready(folder, 'd-9')).toThrow(
      "There isn't any decision page with the id d-9. Create one with page <parent> <file-name> --type=decision.",
    )
  })

  it('throws when the id isn’t a decision id', () => {
    expect(() => ready(folderWith(finishedDecisionPage('d-1')), 'c-1')).toThrow(
      InvalidDecisionIdError,
    )
  })

  it('keeps the decision listed when the agent breaks the page after it was ready', () => {
    const folder = folderWith(finishedDecisionPage('d-1'))
    ready(folder)
    writeFileInPad(folder, 'pages/1.1-idea.md', decisionPageTemplate('d-1'))

    expect(decisionIds(folder)).toStrictEqual(['d-1'])
  })

  it('keeps the decision listed when the agent fixes the page that it broke', () => {
    const folder = folderWith(finishedDecisionPage('d-1'))
    ready(folder)
    writeFileInPad(folder, 'pages/1.1-idea.md', decisionPageTemplate('d-1'))
    writeFileInPad(folder, 'pages/1.1-idea.md', finishedDecisionPage('d-1'))

    expect(decisionIds(folder)).toStrictEqual(['d-1'])
  })

  it('lists a problem without a heading when the page has only the marker', () => {
    const folder = folderWith(':::decision-page d-1\n:::\n')

    expect(() => ready(folder)).toThrow(/^ {2}pages\/1\.1-idea\.md:\d+: /mu)
  })

  it('doesn’t list an inline decision on a draft page until the agent makes the page ready', () => {
    const inline =
      '\n#### Wait?\n\n:::decision d-2\nproposal: A\nalternative: B\npick: proposal\n:::\n'
    const folder = folderWith(
      finishedDecisionPage('d-1').replace(
        '## Agent recommendation',
        `${inline}\n## Agent recommendation`,
      ),
    )

    expect(decisionIds(folder)).toStrictEqual([])

    ready(folder)

    expect(decisionIds(folder).toSorted((a, b) => a.localeCompare(b))).toStrictEqual(['d-1', 'd-2'])
  })
})
