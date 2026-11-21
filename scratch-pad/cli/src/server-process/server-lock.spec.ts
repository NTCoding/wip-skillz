import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  removeTemporaryHomes,
  temporaryHome,
} from '../scratch-pad-folder/scratch-pad-folder-fixtures'
import { BrokenServerLockError, ServerLock } from './server-lock'

const locks: ServerLock[] = []

afterEach(() => {
  locks.splice(0).forEach((lock) => lock.release())
  removeTemporaryHomes()
})

function claimed(home: string): ServerLock | undefined {
  const lock = ServerLock.claim(home)
  if (lock !== undefined) {
    locks.push(lock)
  }
  return lock
}

describe('ServerLock', () => {
  it('returns undefined when another server holds the lock of the home folder', () => {
    const home = temporaryHome()
    claimed(home)

    expect(claimed(home)).toBeUndefined()
  })

  it('returns a lock when the server that held the lock has released it', () => {
    const home = temporaryHome()
    ServerLock.claim(home)?.release()

    expect(claimed(home)).toBeInstanceOf(ServerLock)
  })

  it('returns a lock when the home folder does not exist yet', () => {
    expect(claimed(join(temporaryHome(), 'scratchpads'))).toBeInstanceOf(ServerLock)
  })

  it('throws BrokenServerLockError when the lock file is not a lock', () => {
    const home = temporaryHome()
    const path = join(home, '.scratch-pad-server.lock')
    writeFileSync(path, 'The export job retries 5 times. '.repeat(10))

    expect(() => claimed(home)).toThrow(BrokenServerLockError)
    expect(() => claimed(home)).toThrow(
      `The server can't lock ${path}: Error: file is not a database. Delete ${path} and start the server again.`,
    )
  })
})
