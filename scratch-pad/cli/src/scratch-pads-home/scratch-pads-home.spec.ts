import { existsSync, mkdirSync, readFileSync, renameSync } from 'node:fs'
import { join, relative } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ScratchPadExistsError } from '../scratch-pad-folder/scratch-pad-folder'
import {
  exportJobScratchPad,
  removeTemporaryHomes,
  temporaryHome,
} from '../scratch-pad-folder/scratch-pad-folder-fixtures'
import {
  MissingHomeError,
  NoScratchPadSelectedError,
  UnknownScratchPadError,
  chooseScratchPad,
  createScratchPad,
  scratchPadNames,
  scratchPadsHome,
} from './scratch-pads-home'

const today = new Date(2026, 2, 4, 9, 30)

afterEach(() => {
  removeTemporaryHomes()
})

describe('scratchPadsHome', () => {
  it('returns SCRATCH_PADS_HOME when it is set', () => {
    expect(scratchPadsHome({ SCRATCH_PADS_HOME: '/pads', HOME: '/users/jo' })).toBe('/pads')
  })

  it('returns the absolute path in the current folder when SCRATCH_PADS_HOME is a relative path', () => {
    expect(scratchPadsHome({ SCRATCH_PADS_HOME: 'pads', HOME: '/users/jo' })).toBe(
      join(process.cwd(), 'pads'),
    )
  })

  it('returns the scratch-pads folder in HOME when SCRATCH_PADS_HOME is empty', () => {
    expect(scratchPadsHome({ SCRATCH_PADS_HOME: '', HOME: '/users/jo' })).toBe(
      '/users/jo/scratch-pads',
    )
  })

  it.each([{}, { HOME: '' }])(
    'throws MissingHomeError when neither folder is set in %j',
    (environment) => {
      expect(() => scratchPadsHome(environment)).toThrow(MissingHomeError)
      expect(() => scratchPadsHome(environment)).toThrow(
        'Neither SCRATCH_PADS_HOME nor HOME is set.',
      )
    },
  )
})

describe('scratchPadNames', () => {
  it('leaves out a scratch pad when its folder name starts with a dot', () => {
    const home = temporaryHome()
    exportJobScratchPad(home)
    renameSync(join(home, '2026-03-14-export-job'), join(home, '.2026-03-14-export-job-a1B2c3'))

    expect(scratchPadNames(home)).toStrictEqual([])
  })

  it('lists the folders in alphabetical order when they have a pad.db', () => {
    const home = temporaryHome()
    createScratchPad(home, 'retry limit', today)
    exportJobScratchPad(home)
    mkdirSync(join(home, 'not-a-pad'))

    expect(scratchPadNames(home)).toStrictEqual(['2026-03-04-retry-limit', '2026-03-14-export-job'])
  })

  it('lists nothing when the home folder does not exist', () => {
    expect(scratchPadNames(join(temporaryHome(), 'missing'))).toStrictEqual([])
  })
})

describe('chooseScratchPad', () => {
  it('chooses a scratch pad by its folder name', () => {
    const home = temporaryHome()
    exportJobScratchPad(home)

    expect(chooseScratchPad(home, '2026-03-14-export-job').path).toBe(
      join(home, '2026-03-14-export-job'),
    )
  })

  it('chooses a scratch pad by its path', () => {
    const folder = exportJobScratchPad(temporaryHome())

    expect(chooseScratchPad('/elsewhere', folder.path).path).toBe(folder.path)
  })

  it('chooses a scratch pad by a relative path', () => {
    const folder = exportJobScratchPad(temporaryHome())

    expect(chooseScratchPad('/elsewhere', relative(process.cwd(), folder.path)).path).toBe(
      folder.path,
    )
  })

  it('chooses a scratch pad by its folder name when the name ends with a slash', () => {
    const home = temporaryHome()
    exportJobScratchPad(home)

    expect(chooseScratchPad(home, '2026-03-14-export-job/').path).toBe(
      join(home, '2026-03-14-export-job'),
    )
  })

  it.each(['.', './'])('chooses the current folder when the selector is %j', (selector) => {
    const folder = exportJobScratchPad(temporaryHome())
    vi.spyOn(process, 'cwd').mockReturnValue(folder.path)

    expect(chooseScratchPad('/elsewhere', selector).path).toBe(folder.path)
  })

  it('chooses the parent folder when the selector is ..', () => {
    const folder = exportJobScratchPad(temporaryHome())
    vi.spyOn(process, 'cwd').mockReturnValue(join(folder.path, 'pages'))

    expect(chooseScratchPad('/elsewhere', '..').path).toBe(folder.path)
  })

  it.each([undefined, ''])(
    'throws NoScratchPadSelectedError that lists the scratch pads when the selector is %j',
    (selector) => {
      const home = temporaryHome()
      exportJobScratchPad(home)

      expect(() => chooseScratchPad(home, selector)).toThrow(NoScratchPadSelectedError)
      expect(() => chooseScratchPad(home, selector)).toThrow(
        `No scratch pad is selected. Pass --pad <folder> or set SCRATCH_PAD.\nThe scratch pads in ${home} are: 2026-03-14-export-job`,
      )
    },
  )

  it('throws UnknownScratchPadError that explains how to create one when there are none', () => {
    const home = temporaryHome()

    expect(() => chooseScratchPad(home, 'invoice')).toThrow(UnknownScratchPadError)
    expect(() => chooseScratchPad(home, 'invoice')).toThrow(
      `There isn't any scratch pad at invoice.\nThere aren't any scratch pads in ${home} yet. Create one with the new command and a topic.`,
    )
  })
})

describe('createScratchPad', () => {
  it('creates the home folder and the scratch pad when the home folder is missing', () => {
    const home = join(temporaryHome(), 'pads')

    const folder = createScratchPad(home, 'retry limit', today)

    expect(existsSync(join(folder.path, 'pad.db'))).toBe(true)
  })

  it('writes the topic with a capital letter as the title of the index page', () => {
    const folder = createScratchPad(temporaryHome(), 'retry limit', today)

    expect(readFileSync(join(folder.path, 'pages', 'index.md'), 'utf8')).toBe('# Retry limit\n')
  })

  it('uses the same title for the progress tracker', () => {
    const folder = createScratchPad(temporaryHome(), 'retry limit', today)

    expect(folder.read((pad) => pad.readProgressTracker()).title).toBe('Retry limit')
  })

  it('appends a scratch-pad-created event as the first event', () => {
    const folder = createScratchPad(temporaryHome(), 'retry limit', today)

    expect(folder.read((pad) => pad.readEvents())).toStrictEqual([
      {
        number: 1,
        time: today.toISOString(),
        kind: 'scratch-pad-created',
        by: 'agent',
        item: undefined,
      },
    ])
  })

  it('throws ScratchPadExistsError when the folder exists', () => {
    const home = temporaryHome()
    createScratchPad(home, 'retry limit', today)

    expect(() => createScratchPad(home, 'Retry limit', today)).toThrow(ScratchPadExistsError)
    expect(() => createScratchPad(home, 'Retry limit', today)).toThrow(
      `2026-03-04-retry-limit already exists in ${home}.`,
    )
  })
})
