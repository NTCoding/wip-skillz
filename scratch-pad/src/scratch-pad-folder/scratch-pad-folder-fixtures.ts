import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
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
  return ScratchPadFolder.create(
    join(home, '2026-03-14-export-job'),
    newProgressTracker('Export job'),
    exportJobIndexPage,
  )
}

export function writeFileInPad(folder: ScratchPadFolder, file: string, text: string): void {
  writeFileSync(join(folder.path, file), text)
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
