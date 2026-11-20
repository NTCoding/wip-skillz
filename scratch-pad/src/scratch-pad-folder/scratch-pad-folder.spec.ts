import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { afterEach, describe, expect, it } from 'vitest'
import { EmptyTaskTitleError } from '../progress-tracker/progress-tracker'
import { BrokenPadDbError } from './pad-row'
import {
  MissingPadDbError,
  NewerPadDbError,
  PadDbFailureError,
  ScratchPadFolder,
} from './scratch-pad-folder'
import {
  exportJobIndexPage,
  exportJobScratchPad,
  removeTemporaryHomes,
  runSqlOnPadDb,
  temporaryHome,
  writeFileInPad,
} from './scratch-pad-folder-fixtures'

const time = '2026-03-14T09:30:00.000Z'
const goalSet = { time, kind: 'goal-set', by: 'agent', item: undefined } as const
const exportJobTracker = { title: 'Export job', goal: undefined, tasks: [] }
const brokenMessage =
  'Nothing was saved. Tell Nick, because the threads, the decisions and the progress tracker of the scratch pad are in pad.db.'

function pragma(folder: ScratchPadFolder, name: string): unknown {
  const db = new DatabaseSync(join(folder.path, 'pad.db'))
  try {
    return db.prepare(`PRAGMA ${name}`).get()?.[name]
  } finally {
    db.close()
  }
}

describe('ScratchPadFolder', () => {
  afterEach(() => {
    removeTemporaryHomes()
  })

  it('creates the pages folder and pad.db', () => {
    const folder = exportJobScratchPad(temporaryHome())
    expect(
      readdirSync(folder.path).toSorted((first, second) => first.localeCompare(second)),
    ).toStrictEqual(['pad.db', 'pages'])
  })

  it('writes the index page', () => {
    const folder = exportJobScratchPad(temporaryHome())
    expect(folder.readPageLines('pages/index.md')).toStrictEqual(exportJobIndexPage.split('\n'))
  })

  it('creates pad.db in WAL mode', () => {
    expect(pragma(exportJobScratchPad(temporaryHome()), 'journal_mode')).toBe('wal')
  })

  it('stores the version of the tables in pad.db', () => {
    expect(pragma(exportJobScratchPad(temporaryHome()), 'user_version')).toBe(1)
  })

  it('saves what the creator writes into pad.db', () => {
    const folder = exportJobScratchPad(temporaryHome())
    expect(folder.read((pad) => pad.readProgressTracker())).toStrictEqual(exportJobTracker)
  })

  it('is recognised as a scratch pad because it has a pad.db', () => {
    const folder = exportJobScratchPad(temporaryHome())
    rmSync(join(folder.path, 'pages'), { recursive: true })

    expect(ScratchPadFolder.isScratchPad(folder.path)).toBe(true)
  })

  it('is recognised as a scratch pad when it has pages but pad.db is missing', () => {
    const folder = exportJobScratchPad(temporaryHome())
    rmSync(join(folder.path, 'pad.db'))

    expect(ScratchPadFolder.isScratchPad(folder.path)).toBe(true)
  })

  it('is not recognised as a scratch pad when it has neither pages nor pad.db', () => {
    expect(ScratchPadFolder.isScratchPad(temporaryHome())).toBe(false)
  })

  it('is named after its folder', () => {
    const folder = exportJobScratchPad(temporaryHome())
    expect(folder.name).toBe('2026-03-14-export-job')
  })

  it('returns the result of a change', () => {
    const folder = exportJobScratchPad(temporaryHome())
    expect(folder.change((pad) => pad.appendEvent(goalSet).number)).toBe(1)
  })

  it('reads what an earlier change saved', () => {
    const folder = exportJobScratchPad(temporaryHome())
    folder.change((pad) => pad.appendEvent(goalSet))

    expect(folder.read((pad) => pad.readEvents())).toStrictEqual([{ number: 1, ...goalSet }])
  })

  it('saves nothing of a change that throws', () => {
    const folder = exportJobScratchPad(temporaryHome())
    const change = () =>
      folder.change((pad) => {
        pad.writeProgressTracker({ ...exportJobTracker, goal: 'Ship it.' })
        pad.appendEvent(goalSet)
        throw new EmptyTaskTitleError()
      })

    expect(change).toThrow(EmptyTaskTitleError)
    expect(folder.read((pad) => [pad.readProgressTracker(), pad.readEvents()])).toStrictEqual([
      exportJobTracker,
      [],
    ])
  })

  it('throws PadDbFailureError when SQLite refuses a change', () => {
    const folder = exportJobScratchPad(temporaryHome())
    const task = { number: 0, title: 'Write the retry policy', state: 'to-do' } as const
    const change = () =>
      folder.change((pad) => pad.writeProgressTracker({ ...exportJobTracker, tasks: [task] }))

    expect(change).toThrow(PadDbFailureError)
    expect(change).toThrow(
      'pad.db in 2026-03-14-export-job failed: CHECK constraint failed: number >= 1. Nothing was saved, so you can run the command again.',
    )
  })

  it('throws PadDbFailureError when pad.db cannot be created', () => {
    const path = join(temporaryHome(), '2026-03-14-export-job')
    mkdirSync(join(path, 'pad.db'), { recursive: true })
    const create = () => ScratchPadFolder.create(path, exportJobIndexPage, () => undefined)

    expect(create).toThrow(PadDbFailureError)
    expect(create).toThrow(
      'pad.db in 2026-03-14-export-job failed: unable to open database file. Nothing was saved, so you can run the command again.',
    )
  })

  it('throws MissingPadDbError when pad.db is missing', () => {
    const folder = exportJobScratchPad(temporaryHome())
    rmSync(join(folder.path, 'pad.db'))
    const read = () => folder.read((pad) => pad.readEvents())

    expect(read).toThrow(MissingPadDbError)
    expect(read).toThrow(
      "2026-03-14-export-job doesn't have a pad.db, so its threads, decisions and progress tracker can't be read. Tell Nick.",
    )
  })

  it('does not create an empty pad.db when pad.db is missing', () => {
    const folder = exportJobScratchPad(temporaryHome())
    rmSync(join(folder.path, 'pad.db'))

    expect(() => folder.change((pad) => pad.appendEvent(goalSet))).toThrow(MissingPadDbError)
    expect(existsSync(join(folder.path, 'pad.db'))).toBe(false)
  })

  it('throws BrokenPadDbError without telling anyone to delete pad.db when it is not a database', () => {
    const folder = exportJobScratchPad(temporaryHome())
    writeFileInPad(folder, 'pad.db', 'The export job retries 5 times.\n'.repeat(40))
    const read = () => folder.read((pad) => pad.readEvents())

    expect(read).toThrow(BrokenPadDbError)
    expect(read).toThrow(
      `pad.db in 2026-03-14-export-job is broken: file is not a database. ${brokenMessage}`,
    )
  })

  it('throws BrokenPadDbError when pad.db does not contain the tables', () => {
    const folder = exportJobScratchPad(temporaryHome())
    writeFileSync(join(folder.path, 'pad.db'), '')
    const read = () => folder.read((pad) => pad.readEvents())

    expect(read).toThrow(BrokenPadDbError)
    expect(read).toThrow(
      `pad.db in 2026-03-14-export-job is broken: it doesn't contain the tables of a scratch pad. ${brokenMessage}`,
    )
  })

  it('throws NewerPadDbError when the tables come from a newer scratch-pad', () => {
    const folder = exportJobScratchPad(temporaryHome())
    runSqlOnPadDb(folder, 'PRAGMA user_version = 2')
    const read = () => folder.read((pad) => pad.readEvents())

    expect(read).toThrow(NewerPadDbError)
    expect(read).toThrow(
      'pad.db in 2026-03-14-export-job has the tables of version 2, but this scratch-pad only knows version 1. Update scratch-pad.',
    )
  })

  it('lists the Markdown files in the pages folder', () => {
    const folder = exportJobScratchPad(temporaryHome())
    ;['retry.md', 'audit.md', 'notes.txt'].forEach((file) =>
      writeFileInPad(folder, `pages/${file}`, '# x'),
    )

    expect(folder.pages().toSorted((first, second) => first.localeCompare(second))).toStrictEqual([
      'pages/audit.md',
      'pages/index.md',
      'pages/retry.md',
    ])
  })

  it('lists no pages when the pages folder is missing', () => {
    expect(new ScratchPadFolder(temporaryHome()).pages()).toStrictEqual([])
  })

  it('reads no lines when the page does not exist', () => {
    const folder = exportJobScratchPad(temporaryHome())
    expect(folder.readPageLines('pages/missing.md')).toStrictEqual([])
  })

  it('reads no lines when the path is outside the pages folder', () => {
    const folder = exportJobScratchPad(temporaryHome())
    expect(folder.readPageLines('pad.db')).toStrictEqual([])
  })
})
