import { afterEach, describe, expect, it } from 'vitest'
import {
  exportJobAddress,
  missingLinksText,
  servedLinks,
  unservedLinks,
} from '../item-links/item-links-fixtures'
import {
  exportJobScratchPad,
  freezeClockAt,
  removeTemporaryHomes,
  temporaryHome,
} from '../scratch-pad-folder/scratch-pad-folder-fixtures'
import { logDecisionFromChat } from './decision-log-commands'

const time = '2026-03-14T09:30:00.000Z'

freezeClockAt(time)

afterEach(() => {
  removeTemporaryHomes()
})

describe('logDecisionFromChat', () => {
  it('prints the number of the logged decision and the link to the log of decisions', () => {
    expect(
      logDecisionFromChat(exportJobScratchPad(temporaryHome()), 'Keep 5 retries.', servedLinks),
    ).toBe(`decision 1 is logged\nlink: ${exportJobAddress}decisions`)
  })

  it("prints that there aren't any links when the server isn't running", () => {
    expect(
      logDecisionFromChat(exportJobScratchPad(temporaryHome()), 'Keep 5 retries.', unservedLinks),
    ).toBe(`decision 1 is logged\n${missingLinksText}`)
  })

  it('logs the decision with the chat as its source', () => {
    const folder = exportJobScratchPad(temporaryHome())

    logDecisionFromChat(folder, 'Keep 5 retries.', servedLinks)

    expect(folder.read((pad) => pad.readDecisionLog())).toStrictEqual([
      { number: 1, time, source: 'chat', text: 'Keep 5 retries.', decision: undefined },
    ])
  })

  it('appends a decision-logged event by the agent', () => {
    const folder = exportJobScratchPad(temporaryHome())

    logDecisionFromChat(folder, 'Keep 5 retries.', servedLinks)

    expect(folder.read((pad) => pad.readEvents())).toStrictEqual([
      { number: 1, time, kind: 'decision-logged', by: 'agent', item: undefined },
    ])
  })
})
