import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { isPagePath } from '../pages/page-markdown'
import { ScratchPadError } from '../scratch-pad-error'
import { PadDb } from './pad-db'
import {
  BrokenPadDbError,
  MissingPadDbError,
  NewerPadDbError,
  padDbErrorFrom,
} from './pad-db-errors'
import { padSchema, padSchemaVersion, padTables } from './pad-schema'
import { readSavedValues } from './saved-values'

const padDbFile = 'pad.db'
const pagesFolder = 'pages'
const busyTimeoutMilliseconds = 5000

export class ScratchPadExistsError extends ScratchPadError {
  constructor(path: string) {
    super(
      `${basename(path)} already exists in ${dirname(path)}. Pick another topic or work in the existing scratch pad.`,
    )
  }
}

export class ScratchPadFolder {
  constructor(readonly path: string) {}

  static isScratchPad(path: string): boolean {
    return existsSync(join(path, padDbFile)) || existsSync(join(path, pagesFolder))
  }

  static create(path: string, indexPage: string, fill: (pad: PadDb) => void): ScratchPadFolder {
    if (existsSync(path)) {
      throw new ScratchPadExistsError(path)
    }
    const building = new ScratchPadFolder(mkdtempSync(join(dirname(path), `.${basename(path)}-`)))
    try {
      building.build(indexPage, fill)
      renameSync(building.path, path)
    } catch (error) {
      throw existsSync(path) ? new ScratchPadExistsError(path) : error
    } finally {
      rmSync(building.path, { recursive: true, force: true })
    }
    return new ScratchPadFolder(path)
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

  private build(indexPage: string, fill: (pad: PadDb) => void): void {
    mkdirSync(join(this.path, pagesFolder))
    writeFileSync(join(this.path, pagesFolder, 'index.md'), indexPage)
    this.usePadDb((db) => {
      db.exec('PRAGMA journal_mode = WAL')
      this.inTransaction(db, 'BEGIN IMMEDIATE', (pad) => {
        db.exec(padSchema)
        fill(pad)
      })
    })
  }

  private withPadDb<T>(use: (db: DatabaseSync) => T): T {
    if (!existsSync(join(this.path, padDbFile))) {
      throw new MissingPadDbError(this.name)
    }
    return this.usePadDb((db) => {
      this.checkPadDb(db)
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
      throw padDbErrorFrom(error, this.name)
    }
  }

  private checkPadDb(db: DatabaseSync): void {
    const [damage] = readSavedValues(
      db,
      this.name,
      'pragma_quick_check',
      'SELECT quick_check FROM pragma_quick_check()',
    )
      .map((result) => result.text('quick_check'))
      .filter((result) => result !== 'ok')
    if (damage !== undefined) {
      throw new BrokenPadDbError(this.name, damage)
    }
    const versions = readSavedValues(
      db,
      this.name,
      'pragma_user_version',
      'SELECT user_version FROM pragma_user_version()',
    ).map((result) => result.wholeNumber('user_version'))
    const newer = versions.find((version) => version > padSchemaVersion)
    if (newer !== undefined) {
      throw new NewerPadDbError(this.name, newer)
    }
    if (!versions.includes(padSchemaVersion)) {
      throw new BrokenPadDbError(this.name, "it doesn't contain the tables of a scratch pad")
    }
    const tables = readSavedValues(
      db,
      this.name,
      'sqlite_schema',
      "SELECT name FROM sqlite_schema WHERE type = 'table'",
    ).map((table) => table.text('name'))
    const missing = padTables.find((table) => !tables.includes(table))
    if (missing !== undefined) {
      throw new BrokenPadDbError(this.name, `it doesn't contain the table ${missing}`)
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
