import { closeSync, mkdtempSync, openSync, rmSync, writeFileSync, writeSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { afterEach, beforeEach, vi } from 'vitest'
import { newProgressTracker } from '../progress-tracker/progress-tracker'
import { padSchema } from './pad-schema'
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
  db.exec(padSchema)
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
