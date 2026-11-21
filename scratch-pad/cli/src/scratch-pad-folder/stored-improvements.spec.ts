import { afterEach, describe, expect, it } from 'vitest'
import {
  exportJobPadName,
  firstVersionScratchPad,
  inMemoryPadDb,
  removeTemporaryHomes,
  temporaryHome,
} from './scratch-pad-folder-fixtures'
import { StoredImprovements } from './stored-improvements'

const time = '2026-03-14T09:30:00.000Z'

afterEach(() => {
  removeTemporaryHomes()
})

const storedImprovements = () => new StoredImprovements(inMemoryPadDb(), exportJobPadName)

const exportBug = { time, title: 'The export skips the custom files.', details: undefined }
const inboxBug = { time, title: 'The inbox prints a note twice.', details: '## Steps' }

describe('StoredImprovements', () => {
  it('numbers the saved improvements from 1 and reads them back in the order of the numbers', () => {
    const stored = storedImprovements()

    expect([stored.save(exportBug), stored.save(inboxBug)]).toStrictEqual([
      { number: 1, ...exportBug },
      { number: 2, ...inboxBug },
    ])
    expect(stored.read()).toStrictEqual([
      { number: 1, ...exportBug },
      { number: 2, ...inboxBug },
    ])
  })

  it('never gives a new improvement the number of a deleted improvement, even when the deleted improvement was the last one', () => {
    const stored = storedImprovements()
    stored.save(exportBug)
    stored.save(inboxBug)
    stored.delete(2)

    expect(stored.save(inboxBug).number).toBe(3)
  })

  it('replaces the title and the details of the improvement with the same number when it is updated', () => {
    const stored = storedImprovements()
    stored.save({ time, title: 'The export skips files.', details: '## Steps' })
    const edited = { number: 1, time, title: 'The export skips custom files.', details: undefined }
    stored.update(edited)

    expect(stored.read()).toStrictEqual([edited])
  })

  it('removes only the improvement with the number when it is deleted', () => {
    const stored = storedImprovements()
    stored.save(exportBug)
    stored.save(inboxBug)
    stored.delete(1)

    expect(stored.read()).toStrictEqual([{ number: 2, ...inboxBug }])
  })

  it('saves the improvements of a scratch pad of version 1 once pad.db is migrated', () => {
    const folder = firstVersionScratchPad(temporaryHome())
    folder.change((pad) => pad.saveImprovement(exportBug))

    expect(folder.read((pad) => pad.readImprovements())).toStrictEqual([
      { number: 1, ...exportBug },
    ])
  })
})
