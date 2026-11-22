import {
  chmodSync,
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { afterEach, describe, expect, it } from 'vitest'
import { EmptyTaskTitleError } from '../progress-tracker/progress-tracker'
import {
  BrokenPadDbError,
  BusyPadDbError,
  MissingPadDbError,
  NewerPadDbError,
  PadDbFailureError,
} from './pad-db-errors'
import { ScratchPadExistsError, ScratchPadFolder } from './scratch-pad-folder'
import {
  damageTableOfPadDb,
  exportJobIndexPage,
  exportJobScratchPad,
  firstVersionScratchPad,
  refuseNewEvents,
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

function inTextOrder(names: readonly string[]): string[] {
  return names.toSorted((first, second) => first.localeCompare(second))
}

afterEach(() => {
  removeTemporaryHomes()
})

describe('ScratchPadFolder.create', () => {
  it('creates the pages folder and pad.db when the scratch pad is created', () => {
    const folder = exportJobScratchPad(temporaryHome())
    expect(inTextOrder(readdirSync(folder.path))).toStrictEqual(['pad.db', 'pages'])
  })

  it('writes the index page when the scratch pad is created', () => {
    const folder = exportJobScratchPad(temporaryHome())
    expect(folder.readPageLines('pages/index.md')).toStrictEqual(exportJobIndexPage.split('\n'))
  })

  it('creates pad.db in WAL mode when the scratch pad is created', () => {
    expect(pragma(exportJobScratchPad(temporaryHome()), 'journal_mode')).toBe('wal')
  })

  it('stores the version of the tables in pad.db when the scratch pad is created', () => {
    expect(pragma(exportJobScratchPad(temporaryHome()), 'user_version')).toBe(3)
  })

  it('migrates pad.db to version 3 when a scratch pad of version 1 is read by a schema of version 3', () => {
    const folder = firstVersionScratchPad(temporaryHome())
    const thread = folder.read((pad) => pad.readThread('c-1'))

    expect(thread.anchor).toStrictEqual({
      firstLine: 5,
      lastLine: 5,
      selectedText: 'retries 5 times',
      prefix: undefined,
      suffix: undefined,
    })
    expect(pragma(folder, 'user_version')).toBe(3)
  })

  it('keeps the threads of version 1 when the migrated scratch pad is changed', () => {
    const folder = firstVersionScratchPad(temporaryHome())
    folder.change((pad) => pad.writeThread({ ...pad.readThread('c-1'), waitsFor: 'nick' }))

    expect(folder.read((pad) => pad.readThreads().map((thread) => thread.waitsFor))).toStrictEqual([
      'nick',
    ])
  })

  it('saves what the creator writes into pad.db when the scratch pad is created', () => {
    const folder = exportJobScratchPad(temporaryHome())
    expect(folder.read((pad) => pad.readProgressTracker())).toStrictEqual(exportJobTracker)
  })

  it("doesn't show the scratch pad in the home folder when the creator is still writing", () => {
    const home = temporaryHome()
    const shownWhileWriting: string[][] = []
    ScratchPadFolder.create(join(home, '2026-03-14-export-job'), exportJobIndexPage, () => {
      shownWhileWriting.push(readdirSync(home).filter((name) => !name.startsWith('.')))
    })

    expect(shownWhileWriting).toStrictEqual([[]])
  })

  it('leaves nothing in the home folder when the creator throws', () => {
    const home = temporaryHome()
    const create = () =>
      ScratchPadFolder.create(join(home, '2026-03-14-export-job'), exportJobIndexPage, () => {
        throw new EmptyTaskTitleError()
      })

    expect(create).toThrow(EmptyTaskTitleError)
    expect(readdirSync(home)).toStrictEqual([])
  })

  it('throws PadDbFailureError and leaves nothing behind when SQLite refuses what the creator writes', () => {
    const home = temporaryHome()
    const task = { number: 0, title: 'Write the retry policy', state: 'to-do' } as const
    const create = () =>
      ScratchPadFolder.create(join(home, '2026-03-14-export-job'), exportJobIndexPage, (pad) =>
        pad.writeProgressTracker({ ...exportJobTracker, tasks: [task] }),
      )

    expect(create).toThrow(PadDbFailureError)
    expect(create).toThrow(
      'failed: CHECK constraint failed: number >= 1. Nothing was saved. Tell Nick.',
    )
    expect(readdirSync(home)).toStrictEqual([])
  })

  it('throws ScratchPadExistsError when another process created the scratch pad first', () => {
    const home = temporaryHome()
    const path = join(home, '2026-03-14-export-job')
    const create = () =>
      ScratchPadFolder.create(path, exportJobIndexPage, () => {
        mkdirSync(join(path, 'pages'), { recursive: true })
      })

    expect(create).toThrow(ScratchPadExistsError)
    expect(create).toThrow(
      `2026-03-14-export-job already exists in ${home}. Pick another topic or work in the existing scratch pad.`,
    )
    expect(readdirSync(home)).toStrictEqual(['2026-03-14-export-job'])
  })
})

describe('ScratchPadFolder', () => {
  it('is recognised as a scratch pad when it has a pad.db but no pages', () => {
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

  it('has the name of its folder when it is created', () => {
    const folder = exportJobScratchPad(temporaryHome())
    expect(folder.name).toBe('2026-03-14-export-job')
  })

  it('returns the result of the work when a change succeeds', () => {
    const folder = exportJobScratchPad(temporaryHome())
    expect(folder.change((pad) => pad.appendEvent(goalSet).number)).toBe(1)
  })

  it('reads the saved events when an earlier change appended them', () => {
    const folder = exportJobScratchPad(temporaryHome())
    folder.change((pad) => pad.appendEvent(goalSet))

    expect(folder.read((pad) => pad.readEvents())).toStrictEqual([{ number: 1, ...goalSet }])
  })

  it('saves nothing when a change throws', () => {
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

  it('throws PadDbFailureError that tells the agent to tell Nick when SQLite refuses a change', () => {
    const folder = exportJobScratchPad(temporaryHome())
    const task = { number: 0, title: 'Write the retry policy', state: 'to-do' } as const
    const change = () =>
      folder.change((pad) => pad.writeProgressTracker({ ...exportJobTracker, tasks: [task] }))

    expect(change).toThrow(PadDbFailureError)
    expect(change).toThrow(
      'pad.db in 2026-03-14-export-job failed: CHECK constraint failed: number >= 1. Nothing was saved. Tell Nick.',
    )
  })

  it('throws PadDbFailureError that tells the agent to tell Nick when pad.db is read-only', () => {
    const folder = exportJobScratchPad(temporaryHome())
    chmodSync(join(folder.path, 'pad.db'), 0o444)
    const change = () => folder.change((pad) => pad.appendEvent(goalSet))

    expect(change).toThrow(PadDbFailureError)
    expect(change).toThrow(
      'pad.db in 2026-03-14-export-job failed: attempt to write a readonly database. Nothing was saved. Tell Nick.',
    )
  })

  it('throws BusyPadDbError that tells the agent to run the command again when another process wrote first', () => {
    const folder = exportJobScratchPad(temporaryHome())
    const change = () =>
      folder.read((pad) => {
        pad.readEvents()
        runSqlOnPadDb(
          folder,
          `INSERT INTO events (time, kind, author) VALUES ('${time}', 'goal-set', 'nick')`,
        )
        return pad.appendEvent(goalSet)
      })

    expect(change).toThrow(BusyPadDbError)
    expect(change).toThrow(
      'pad.db in 2026-03-14-export-job is busy: database is locked. Nothing was saved, so you can run the command again.',
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

  it('throws BrokenPadDbError when a page of pad.db is damaged', () => {
    const folder = exportJobScratchPad(temporaryHome())
    damageTableOfPadDb(folder, 'progress_tracker')
    const read = () => folder.read((pad) => pad.readProgressTracker())

    expect(read).toThrow(BrokenPadDbError)
    expect(read).toThrow(
      `pad.db in 2026-03-14-export-job is broken: database disk image is malformed. ${brokenMessage}`,
    )
  })

  it('throws BrokenPadDbError with the result of the check when SQLite refuses a change to a pad.db whose row breaks a rule of its table', () => {
    const folder = exportJobScratchPad(temporaryHome())
    runSqlOnPadDb(
      folder,
      `PRAGMA ignore_check_constraints = ON;
       INSERT INTO tasks (number, title, state) VALUES (0, 'Write the retry policy', 'to-do')`,
    )
    refuseNewEvents(folder)
    const change = () => folder.change((pad) => pad.appendEvent(goalSet))

    expect(change).toThrow(BrokenPadDbError)
    expect(change).toThrow(
      `pad.db in 2026-03-14-export-job is broken: CHECK constraint failed in tasks. ${brokenMessage}`,
    )
  })

  it('returns the events without a check of every row when a row of another table breaks a rule', () => {
    const folder = exportJobScratchPad(temporaryHome())
    runSqlOnPadDb(
      folder,
      `PRAGMA ignore_check_constraints = ON;
       INSERT INTO tasks (number, title, state) VALUES (0, 'Write the retry policy', 'to-do')`,
    )

    expect(folder.read((pad) => pad.readEvents())).toStrictEqual([])
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

  it('throws BrokenPadDbError that names the table when a table of pad.db was dropped', () => {
    const folder = exportJobScratchPad(temporaryHome())
    runSqlOnPadDb(folder, 'DROP TABLE tasks')
    const read = () => folder.read((pad) => pad.readEvents())

    expect(read).toThrow(BrokenPadDbError)
    expect(read).toThrow(
      `pad.db in 2026-03-14-export-job is broken: it doesn't contain the table tasks. ${brokenMessage}`,
    )
  })

  it('throws NewerPadDbError when the tables come from a newer scratch-pad', () => {
    const folder = exportJobScratchPad(temporaryHome())
    runSqlOnPadDb(folder, 'PRAGMA user_version = 4')
    const read = () => folder.read((pad) => pad.readEvents())

    expect(read).toThrow(NewerPadDbError)
    expect(read).toThrow(
      'pad.db in 2026-03-14-export-job has the tables of version 4, but this scratch-pad only knows version 3. Update scratch-pad.',
    )
  })

  it('lists the Markdown files in the pages folder', () => {
    const folder = exportJobScratchPad(temporaryHome())
    ;['retry.md', 'audit.md', 'notes.txt'].forEach((file) =>
      writeFileInPad(folder, `pages/${file}`, '# x'),
    )

    expect(inTextOrder(folder.pages())).toStrictEqual([
      'pages/audit.md',
      'pages/index.md',
      'pages/retry.md',
    ])
  })

  it('lists each page once without its number in the order of the numbers', () => {
    const folder = exportJobScratchPad(temporaryHome())
    ;['2-board-edge.md', 'notes.md', '1.1-evidence.md', '1-comment.md', '3-evidence.md'].forEach(
      (file) => writeFileInPad(folder, `pages/${file}`, '# x'),
    )

    expect(folder.pages()).toStrictEqual([
      'pages/index.md',
      'pages/comment.md',
      'pages/evidence.md',
      'pages/board-edge.md',
      'pages/notes.md',
    ])
  })

  it('reads the page from the file with its number when the page is asked for without the number', () => {
    const folder = exportJobScratchPad(temporaryHome())
    writeFileInPad(folder, 'pages/2-board-edge.md', '# Board edge\nThe edge of the board.')

    expect(folder.readPage('pages/board-edge.md')).toStrictEqual({
      file: 'pages/2-board-edge.md',
      lines: ['# Board edge', 'The edge of the board.'],
    })
  })

  it("returns the page as its file when the page doesn't exist", () => {
    const folder = exportJobScratchPad(temporaryHome())
    expect(folder.readPage('pages/missing.md')).toStrictEqual({
      file: 'pages/missing.md',
      lines: [],
    })
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

  it('reads a custom HTML file when it exists in the custom folder', () => {
    const folder = exportJobScratchPad(temporaryHome())
    mkdirSync(join(folder.path, 'custom'))
    writeFileInPad(folder, 'custom/retry-steps.html', '<ol><li>retry</li></ol>')

    expect(folder.readCustomFile('custom/retry-steps.html')).toBe('<ol><li>retry</li></ol>')
  })

  it('reads nothing when the custom HTML file does not exist', () => {
    expect(
      exportJobScratchPad(temporaryHome()).readCustomFile('custom/missing.html'),
    ).toBeUndefined()
  })

  it('reads nothing when the file is outside the custom folder', () => {
    expect(exportJobScratchPad(temporaryHome()).readCustomFile('pages/index.md')).toBeUndefined()
  })

  it('reads nothing when the custom HTML file is a link to a file outside the custom folder', () => {
    const home = temporaryHome()
    const folder = exportJobScratchPad(home)
    writeFileSync(join(home, 'secret.html'), '<p>the API key of the shop</p>')
    mkdirSync(join(folder.path, 'custom'))
    symlinkSync(join(home, 'secret.html'), join(folder.path, 'custom/retry-steps.html'))

    expect(folder.readCustomFile('custom/retry-steps.html')).toBeUndefined()
  })

  it('reads nothing when the custom folder is a link to a folder outside the scratch pad', () => {
    const home = temporaryHome()
    const folder = exportJobScratchPad(home)
    mkdirSync(join(home, 'elsewhere'))
    writeFileSync(join(home, 'elsewhere/retry-steps.html'), '<p>the API key of the shop</p>')
    symlinkSync(join(home, 'elsewhere'), join(folder.path, 'custom'))

    expect(folder.readCustomFile('custom/retry-steps.html')).toBeUndefined()
  })

  it('reads nothing when the custom HTML file is a folder', () => {
    const folder = exportJobScratchPad(temporaryHome())
    mkdirSync(join(folder.path, 'custom/retry-steps.html'), { recursive: true })

    expect(folder.readCustomFile('custom/retry-steps.html')).toBeUndefined()
  })
})

describe('ScratchPadFolder.pageVersions', () => {
  it('returns a new version of a page when the page file was written again', () => {
    const folder = exportJobScratchPad(temporaryHome())
    writeFileInPad(folder, 'pages/queue.md', '# Queue\n')
    const before = folder.pageVersions()

    writeFileInPad(folder, 'pages/queue.md', '# Queue of exports\n')

    expect(folder.pageVersions().get('pages/queue.md')).not.toBe(before.get('pages/queue.md'))
  })

  it('returns a new version of a page when the agent has changed the number of the page', () => {
    const folder = exportJobScratchPad(temporaryHome())
    writeFileInPad(folder, 'pages/2-queue.md', '# Queue\n')
    const before = folder.pageVersions()

    renameSync(join(folder.path, 'pages/2-queue.md'), join(folder.path, 'pages/3-queue.md'))

    expect(folder.pageVersions().get('pages/queue.md')).not.toBe(before.get('pages/queue.md'))
  })

  it('returns the same versions when no page file was written', () => {
    const folder = exportJobScratchPad(temporaryHome())

    expect(folder.pageVersions()).toStrictEqual(folder.pageVersions())
  })
})
