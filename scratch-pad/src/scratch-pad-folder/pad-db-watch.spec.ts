import { afterEach, describe, expect, it } from 'vitest'
import { addTaskToTracker } from '../agent-commands/progress-tracker-commands'
import { MissingPadDbError } from './pad-db-errors'
import { type PadDbWatch } from './pad-db-watch'
import {
  exportJobScratchPad,
  removeTemporaryHomes,
  temporaryHome,
} from './scratch-pad-folder-fixtures'
import { ScratchPadFolder } from './scratch-pad-folder'

const watches: PadDbWatch[] = []

function watchOf(folder: ScratchPadFolder): PadDbWatch {
  const watch = folder.watchPadDb()
  watches.push(watch)
  return watch
}

afterEach(() => {
  watches.splice(0).forEach((watch) => watch.close())
  removeTemporaryHomes()
})

describe('ScratchPadFolder.watchPadDb', () => {
  it('reports no change when nothing was saved since the watch started', () => {
    const watch = watchOf(exportJobScratchPad(temporaryHome()))

    expect(watch.hasChanged()).toBe(false)
  })

  it('reports a change once when another connection saved something', () => {
    const folder = exportJobScratchPad(temporaryHome())
    const watch = watchOf(folder)

    addTaskToTracker(folder, 'Export the invoices')

    expect([watch.hasChanged(), watch.hasChanged()]).toStrictEqual([true, false])
  })

  it('throws MissingPadDbError when the scratch pad has no pad.db', () => {
    const folder = new ScratchPadFolder(temporaryHome())

    expect(() => folder.watchPadDb()).toThrow(MissingPadDbError)
    expect(() => folder.watchPadDb()).toThrow("doesn't have a pad.db")
  })
})
