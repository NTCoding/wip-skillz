import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { ScratchPadError } from '../scratch-pad-error'

const serverLockFileName = '.scratch-pad-server.lock'
const sqliteBusy = 5

export class BrokenServerLockError extends ScratchPadError {
  constructor(path: string, problem: string) {
    super(`The server can't lock ${path}: ${problem}. Delete ${path} and start the server again.`)
  }
}

export class ServerLock {
  private constructor(private readonly db: DatabaseSync) {}

  static claim(home: string): ServerLock | undefined {
    mkdirSync(home, { recursive: true })
    const path = join(home, serverLockFileName)
    const db = new DatabaseSync(path, { timeout: 0 })
    try {
      db.exec('BEGIN IMMEDIATE')
      return new ServerLock(db)
    } catch (error) {
      db.close()
      if (isBusy(error)) {
        return undefined
      }
      throw new BrokenServerLockError(path, String(error))
    }
  }

  release(): void {
    this.db.close()
  }
}

function isBusy(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'errcode' in error &&
    error.errcode === sqliteBusy
  )
}
