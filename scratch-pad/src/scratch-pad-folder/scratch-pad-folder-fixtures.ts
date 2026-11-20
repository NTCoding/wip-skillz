import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { afterEach, beforeEach, vi } from 'vitest'
import { newProgressTracker } from '../progress-tracker/progress-tracker'
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

export function freezeClockAt(time: string): void {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(time))
  })

  afterEach(() => {
    vi.useRealTimers()
  })
}
