import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { isPagePath } from '../pages/page-markdown'
import { ScratchPadError } from '../scratch-pad-error'
import { PadDb } from './pad-db'
import { BrokenPadDbError } from './pad-row'
import { padSchema, padSchemaVersion } from './pad-schema'

const padDbFile = 'pad.db'
const pagesFolder = 'pages'
const busyTimeoutMilliseconds = 5000
const sqliteNotADatabase = 26
const sqliteCorrupt = 11

export class MissingPadDbError extends ScratchPadError {
  constructor(padName: string) {
    super(
      `${padName} doesn't have a pad.db, so its threads, decisions and progress tracker can't be read. Tell Nick.`,
    )
  }
}

export class NewerPadDbError extends ScratchPadError {
  constructor(padName: string, version: number) {
    super(
      `pad.db in ${padName} has the tables of version ${version}, but this scratch-pad only knows version ${padSchemaVersion}. Update scratch-pad.`,
    )
  }
}

export class PadDbFailureError extends ScratchPadError {
  constructor(padName: string, problem: string) {
    super(
      `pad.db in ${padName} failed: ${problem}. Nothing was saved, so you can run the command again.`,
    )
  }
}

export class ScratchPadFolder {
  constructor(readonly path: string) {}

  static isScratchPad(path: string): boolean {
    return existsSync(join(path, padDbFile)) || existsSync(join(path, pagesFolder))
  }

  static create(path: string, indexPage: string, fill: (pad: PadDb) => void): ScratchPadFolder {
    const folder = new ScratchPadFolder(path)
    mkdirSync(join(path, pagesFolder), { recursive: true })
    writeFileSync(join(path, pagesFolder, 'index.md'), indexPage)
    folder.usePadDb((db) => {
      db.exec('PRAGMA journal_mode = WAL')
      folder.inTransaction(db, 'BEGIN IMMEDIATE', (pad) => {
        db.exec(padSchema)
        fill(pad)
      })
    })
    return folder
  }

  get name(): string {
    return basename(this.path)
  }

  read<T>(work: (pad: PadDb) => T): T {
    return this.withPadDb((db) => this.inTransaction(db, 'BEGIN', work))
  }

  change<T>(work: (pad: PadDb) => T): T {
    return this.withPadDb((db) => this.inTransaction(db, 'BEGIN IMMEDIATE', work))
  }

  pages(): string[] {
    const path = join(this.path, pagesFolder)
    return existsSync(path)
      ? readdirSync(path)
          .filter((name) => name.endsWith('.md'))
          .map((name) => `${pagesFolder}/${name}`)
      : []
  }

  readPageLines(page: string): readonly string[] {
    const path = join(this.path, page)
    return isPagePath(page) && existsSync(path) ? readFileSync(path, 'utf8').split('\n') : []
  }

  private withPadDb<T>(use: (db: DatabaseSync) => T): T {
    if (!existsSync(join(this.path, padDbFile))) {
      throw new MissingPadDbError(this.name)
    }
    return this.usePadDb((db) => {
      this.checkSchemaVersion(db)
      return use(db)
    })
  }

  private usePadDb<T>(use: (db: DatabaseSync) => T): T {
    try {
      const db = new DatabaseSync(join(this.path, padDbFile), { timeout: busyTimeoutMilliseconds })
      try {
        return use(db)
      } finally {
        db.close()
      }
    } catch (error) {
      throw scratchPadErrorFrom(error, this.name)
    }
  }

  private checkSchemaVersion(db: DatabaseSync): void {
    const version = Math.max(
      ...db
        .prepare('PRAGMA user_version')
        .all()
        .map((row) => Number(row['user_version'])),
    )
    if (version > padSchemaVersion) {
      throw new NewerPadDbError(this.name, version)
    }
    if (version < padSchemaVersion) {
      throw new BrokenPadDbError(this.name, "it doesn't contain the tables of a scratch pad")
    }
  }

  private inTransaction<T>(db: DatabaseSync, begin: string, work: (pad: PadDb) => T): T {
    db.exec(begin)
    const result = rolledBackOnError(db, () => work(new PadDb(db, this.name)))
    db.exec('COMMIT')
    return result
  }
}

function rolledBackOnError<T>(db: DatabaseSync, work: () => T): T {
  try {
    return work()
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

function scratchPadErrorFrom(error: unknown, padName: string): unknown {
  if (!isSqliteError(error)) {
    return error
  }
  const primaryCode = error.errcode % 256
  return primaryCode === sqliteNotADatabase || primaryCode === sqliteCorrupt
    ? new BrokenPadDbError(padName, error.message)
    : new PadDbFailureError(padName, error.message)
}

function isSqliteError(error: unknown): error is Error & { readonly errcode: number } {
  return error instanceof Error && 'errcode' in error && typeof error.errcode === 'number'
}
