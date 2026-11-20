import { existsSync, mkdirSync, readdirSync } from 'node:fs'
import { isAbsolute, join, resolve } from 'node:path'
import { newProgressTracker } from '../progress-tracker/progress-tracker'
import { ScratchPadFolder } from '../scratch-pad-folder/scratch-pad-folder'
import { ScratchPadError } from '../scratch-pad-error'
import { scratchPadFolderName, scratchPadTitle } from './scratch-pad-name'

export type Environment = Readonly<Record<string, string | undefined>>

export class MissingHomeError extends ScratchPadError {
  constructor() {
    super(
      'Neither SCRATCH_PADS_HOME nor HOME is set. Set SCRATCH_PADS_HOME to the folder of your scratch pads.',
    )
  }
}

export class NoScratchPadSelectedError extends ScratchPadError {
  constructor(home: string, names: readonly string[]) {
    super(
      `No scratch pad is selected. Pass --pad <folder> or set SCRATCH_PAD.\n${listing(home, names)}`,
    )
  }
}

export class UnknownScratchPadError extends ScratchPadError {
  constructor(selector: string, home: string, names: readonly string[]) {
    super(`There isn't any scratch pad at ${selector}.\n${listing(home, names)}`)
  }
}

export function scratchPadsHome(environment: Environment): string {
  const home = environment['SCRATCH_PADS_HOME']
  if (home !== undefined && home !== '') {
    return home
  }
  const userHome = environment['HOME']
  if (userHome === undefined || userHome === '') {
    throw new MissingHomeError()
  }
  return join(userHome, 'scratch-pads')
}

export function scratchPadNames(home: string): string[] {
  return existsSync(home)
    ? readdirSync(home)
        .filter((name) => !name.startsWith('.') && ScratchPadFolder.isScratchPad(join(home, name)))
        .toSorted((first, second) => first.localeCompare(second))
    : []
}

export function chooseScratchPad(home: string, selector: string | undefined): ScratchPadFolder {
  if (selector === undefined || selector === '') {
    throw new NoScratchPadSelectedError(home, scratchPadNames(home))
  }
  const path = scratchPadPath(home, selector)
  if (!ScratchPadFolder.isScratchPad(path)) {
    throw new UnknownScratchPadError(selector, home, scratchPadNames(home))
  }
  return new ScratchPadFolder(path)
}

export function createScratchPad(home: string, topic: string, today: Date): ScratchPadFolder {
  mkdirSync(home, { recursive: true })
  const title = scratchPadTitle(topic)
  return ScratchPadFolder.create(
    join(home, scratchPadFolderName(topic, today)),
    `# ${title}\n`,
    (pad) => {
      pad.writeProgressTracker(newProgressTracker(title))
      pad.appendEvent({
        time: today.toISOString(),
        kind: 'scratch-pad-created',
        by: 'agent',
        item: undefined,
      })
    },
  )
}

function scratchPadPath(home: string, selector: string): string {
  const name = selector.endsWith('/') ? selector.slice(0, -1) : selector
  const isPath = isAbsolute(selector) || name.includes('/') || name === '.' || name === '..'
  return isPath ? resolve(selector) : join(home, name)
}

function listing(home: string, names: readonly string[]): string {
  return names.length === 0
    ? `There aren't any scratch pads in ${home} yet. Create one with: scratch-pad new <topic>`
    : `The scratch pads in ${home} are: ${names.join(', ')}`
}
