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
import { UnknownImprovementError } from '../improvements/improvements'
import {
  deleteImprovementFromChat,
  editImprovementFromChat,
  logImprovementFromChat,
} from './improvement-commands'

const time = '2026-03-14T09:30:00.000Z'
const title = 'The export skips the custom files.'
const details = '## Steps\n\n1. Run export.\n'

freezeClockAt(time)

afterEach(() => {
  removeTemporaryHomes()
})

describe('logImprovementFromChat', () => {
  it('prints the number of the logged improvement and the link to its entry on the improvements', () => {
    expect(
      logImprovementFromChat(exportJobScratchPad(temporaryHome()), title, details, servedLinks),
    ).toBe(`improvement 1 is logged\nlink: ${exportJobAddress}improvements#improvement-1`)
  })

  it("prints that there aren't any links when the server isn't running", () => {
    expect(
      logImprovementFromChat(exportJobScratchPad(temporaryHome()), title, details, unservedLinks),
    ).toBe(`improvement 1 is logged\n${missingLinksText}`)
  })

  it('logs the improvement with its title and its details', () => {
    const folder = exportJobScratchPad(temporaryHome())

    logImprovementFromChat(folder, title, details, servedLinks)

    expect(folder.read((pad) => pad.readImprovements())).toStrictEqual([
      { number: 1, time, title, details: '## Steps\n\n1. Run export.' },
    ])
  })

  it('appends an improvement-logged event by the agent', () => {
    const folder = exportJobScratchPad(temporaryHome())

    logImprovementFromChat(folder, title, '', servedLinks)

    expect(folder.read((pad) => pad.readEvents())).toStrictEqual([
      { number: 1, time, kind: 'improvement-logged', by: 'agent', item: undefined },
    ])
  })
})

function padWithOneImprovement() {
  const folder = exportJobScratchPad(temporaryHome())
  logImprovementFromChat(folder, title, details, servedLinks)
  return folder
}

describe('editImprovementFromChat', () => {
  it('prints that the improvement is edited and the link to its entry on the improvements', () => {
    expect(
      editImprovementFromChat(
        padWithOneImprovement(),
        1,
        'The export skips files.',
        '',
        servedLinks,
      ),
    ).toBe(`improvement 1 is edited\nlink: ${exportJobAddress}improvements#improvement-1`)
  })

  it('replaces the title and the details of the improvement', () => {
    const folder = padWithOneImprovement()

    editImprovementFromChat(
      folder,
      1,
      'The export skips files.',
      'Run export twice.\n',
      servedLinks,
    )

    expect(folder.read((pad) => pad.readImprovements())).toStrictEqual([
      { number: 1, time, title: 'The export skips files.', details: 'Run export twice.' },
    ])
  })

  it('appends an improvement-edited event by the agent', () => {
    const folder = padWithOneImprovement()

    editImprovementFromChat(folder, 1, 'The export skips files.', '', unservedLinks)

    expect(folder.read((pad) => pad.readEvents().at(-1))).toStrictEqual({
      number: 2,
      time,
      kind: 'improvement-edited',
      by: 'agent',
      item: undefined,
    })
  })

  it('throws UnknownImprovementError and doesn’t append an event when the number is unknown', () => {
    const folder = padWithOneImprovement()

    expect(() => editImprovementFromChat(folder, 2, title, '', servedLinks)).toThrow(
      UnknownImprovementError,
    )
    expect(folder.read((pad) => pad.readEvents())).toHaveLength(1)
  })
})

describe('deleteImprovementFromChat', () => {
  it('prints that the improvement is deleted and the link to the improvements', () => {
    expect(deleteImprovementFromChat(padWithOneImprovement(), 1, servedLinks)).toBe(
      `improvement 1 is deleted\nlink: ${exportJobAddress}improvements`,
    )
  })

  it("prints that there aren't any links when the server isn't running", () => {
    expect(deleteImprovementFromChat(padWithOneImprovement(), 1, unservedLinks)).toBe(
      `improvement 1 is deleted\n${missingLinksText}`,
    )
  })

  it('removes the improvement and appends an improvement-deleted event by the agent', () => {
    const folder = padWithOneImprovement()

    deleteImprovementFromChat(folder, 1, servedLinks)

    expect(
      folder.read((pad) => ({
        improvements: pad.readImprovements(),
        event: pad.readEvents().at(-1),
      })),
    ).toStrictEqual({
      improvements: [],
      event: { number: 2, time, kind: 'improvement-deleted', by: 'agent', item: undefined },
    })
  })

  it('throws UnknownImprovementError when the number is unknown', () => {
    expect(() =>
      deleteImprovementFromChat(exportJobScratchPad(temporaryHome()), 1, servedLinks),
    ).toThrow(UnknownImprovementError)
  })
})
