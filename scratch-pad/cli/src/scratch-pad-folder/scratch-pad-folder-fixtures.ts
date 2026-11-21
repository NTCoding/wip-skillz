import {
  closeSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  rmSync,
  writeFileSync,
  writeSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { afterEach, beforeEach, vi } from 'vitest'
import { newProgressTracker } from '../progress-tracker/progress-tracker'
import { newPadDbSql, padSchema } from './pad-schema'
import { ScratchPadFolder } from './scratch-pad-folder'

const temporaryHomes: string[] = []

export const exportJobIndexPage = [
  '# Export job',
  '',
  '## Retry policy',
  '',
  'The export job retries 5 times.',
  'Each retry waits 30 seconds.',
  '',
].join('\n')

export function temporaryHome(): string {
  const home = mkdtempSync(join(tmpdir(), 'scratch-pad-test-'))
  temporaryHomes.push(home)
  return home
}

export function removeTemporaryHomes(): void {
  temporaryHomes.splice(0).forEach((home) => rmSync(home, { recursive: true, force: true }))
}

export function exportJobScratchPad(home: string): ScratchPadFolder {
  return ScratchPadFolder.create(join(home, '2026-03-14-export-job'), exportJobIndexPage, (pad) =>
    pad.writeProgressTracker(newProgressTracker('Export job')),
  )
}

export function firstVersionScratchPad(home: string): ScratchPadFolder {
  const folder = new ScratchPadFolder(join(home, '2026-03-14-export-job'))
  mkdirSync(join(folder.path, 'pages'), { recursive: true })
  writeFileSync(join(folder.path, 'pages', 'index.md'), exportJobIndexPage)
  const db = new DatabaseSync(join(folder.path, 'pad.db'))
  try {
    db.exec(padSchema.firstTables)
    db.exec(
      `INSERT INTO progress_tracker (id, title) VALUES (1, 'Export job');
       INSERT INTO threads (id, type, page, first_line, last_line, selected_text, waits_for)
       VALUES ('c-1', 'comment', 'pages/index.md', 5, 5, 'retries 5 times', 'agent');
       INSERT INTO messages (thread_id, position, author, text, time)
       VALUES ('c-1', 1, 'nick', 'Is 5 enough?', '2026-03-14T09:30:00.000Z');`,
    )
  } finally {
    db.close()
  }
  return folder
}

export function writeFileInPad(folder: ScratchPadFolder, file: string, text: string): void {
  writeFileSync(join(folder.path, file), text)
}

export function runSqlOnPadDb(folder: ScratchPadFolder, sql: string): void {
  const db = new DatabaseSync(join(folder.path, 'pad.db'))
  try {
    db.exec(sql)
  } finally {
    db.close()
  }
}

export function damageTableOfPadDb(folder: ScratchPadFolder, table: string): void {
  const db = new DatabaseSync(join(folder.path, 'pad.db'))
  const pages = db
    .prepare('SELECT rootpage FROM sqlite_schema WHERE name = ?')
    .all(table)
    .map((row) => Number(row['rootpage']))
  db.close()
  const file = openSync(join(folder.path, 'pad.db'), 'r+')
  pages.forEach((page) => writeSync(file, Buffer.alloc(4096, 0xff), 0, 4096, (page - 1) * 4096))
  closeSync(file)
}

export function refuseNewEvents(folder: ScratchPadFolder): void {
  runSqlOnPadDb(
    folder,
    `CREATE TRIGGER refuse_new_events BEFORE INSERT ON events
     BEGIN SELECT RAISE(ABORT, 'the disk is full'); END`,
  )
}

export function acceptNewEvents(folder: ScratchPadFolder): void {
  runSqlOnPadDb(folder, 'DROP TRIGGER refuse_new_events')
}

export const exportJobPadName = '2026-03-14-export-job'

export function inMemoryPadDb(): DatabaseSync {
  const db = new DatabaseSync(':memory:')
  db.exec(newPadDbSql(padSchema))
  return db
}

export function freezeClockAt(time: string): void {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(time))
  })

  afterEach(() => {
    vi.useRealTimers()
  })
}
