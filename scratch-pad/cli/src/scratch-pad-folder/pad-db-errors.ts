import { ScratchPadError } from '../scratch-pad-error'

const sqliteBusy = 5
const sqliteLocked = 6
const sqliteCorrupt = 11
const sqliteNotADatabase = 26

export class BrokenPadDbError extends ScratchPadError {
  constructor(padName: string, problem: string) {
    super(
      `pad.db in ${padName} is broken: ${problem}. Nothing was saved. Tell Nick, because the threads, the decisions and the progress tracker of the scratch pad are in pad.db.`,
    )
  }
}

export class MissingPadDbError extends ScratchPadError {
  constructor(padName: string) {
    super(
      `${padName} doesn't have a pad.db, so its threads, decisions and progress tracker can't be read. Tell Nick.`,
    )
  }
}

export class NewerPadDbError extends ScratchPadError {
  constructor(padName: string, version: number, knownVersion: number) {
    super(
      `pad.db in ${padName} has the tables of version ${version}, but this scratch-pad only knows version ${knownVersion}. Update scratch-pad.`,
    )
  }
}

export class BusyPadDbError extends ScratchPadError {
  constructor(padName: string, problem: string) {
    super(
      `pad.db in ${padName} is busy: ${problem}. Nothing was saved, so you can run the command again.`,
    )
  }
}

export class PadDbFailureError extends ScratchPadError {
  constructor(padName: string, problem: string) {
    super(`pad.db in ${padName} failed: ${problem}. Nothing was saved. Tell Nick.`)
  }
}

export function padDbErrorFrom(error: unknown, padName: string): unknown {
  if (!isSqliteError(error)) {
    return error
  }
  const primaryCode = error.errcode % 256
  if (primaryCode === sqliteBusy || primaryCode === sqliteLocked) {
    return new BusyPadDbError(padName, error.message)
  }
  return primaryCode === sqliteCorrupt || primaryCode === sqliteNotADatabase
    ? new BrokenPadDbError(padName, error.message)
    : new PadDbFailureError(padName, error.message)
}

function isSqliteError(error: unknown): error is Error & { readonly errcode: number } {
  return error instanceof Error && 'errcode' in error && typeof error.errcode === 'number'
}
