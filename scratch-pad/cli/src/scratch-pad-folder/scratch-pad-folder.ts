import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { basename, dirname, join, sep } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { type PageVersions } from '../pad-changes/pad-change'
import {
  pageFileOf,
  pageFilesInOrder,
  storedPageIds,
  type PageFile,
  type PageLines,
  type StoredPageId,
} from '../pages/page-files'
import { isPagePath } from '../pages/page-markdown'
import { isCustomHtmlPath } from '../rendered-page/html-block'
import { ScratchPadError } from '../scratch-pad-error'
import { PadDb } from './pad-db'
import { PadDbWatch } from './pad-db-watch'
import {
  BrokenPadDbError,
  MissingPadDbError,
  NewerPadDbError,
  PadDbFailureError,
  padDbErrorFrom,
} from './pad-db-errors'
import {
  newPadDbSql,
  padMigrationFillsAfter,
  padMigrationsAfter,
  padSchema,
  padTables,
  type PadSchema,
  type PageMarkdown,
} from './pad-schema'
import { readSavedValues } from './saved-values'

const padDbFile = 'pad.db'
const pagesFolder = 'pages'
const customFolder = 'custom'
const busyTimeoutMilliseconds = 5000

export class ScratchPadExistsError extends ScratchPadError {
  constructor(path: string) {
    super(
      `${basename(path)} already exists in ${dirname(path)}. Pick another topic or work in the existing scratch pad.`,
    )
  }
}

export class ScratchPadFolder {
  constructor(
    readonly path: string,
    private readonly schema: PadSchema = padSchema,
  ) {}

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

  pageFiles(): PageFile[] {
    const path = join(this.path, pagesFolder)
    return existsSync(path)
      ? pageFilesInOrder(
          readdirSync(path)
            .filter((name) => name.endsWith('.md'))
            .map((name) => pageFileOf(`${pagesFolder}/${name}`)),
        )
      : []
  }

  pages(): string[] {
    return [...new Set(this.pageFiles().map((file) => file.page))]
  }

  pageVersions(): PageVersions {
    const files = this.pageFiles()
    return new Map(
      this.pages().map((page) => {
        const file = fileOfPage(files, page)
        const stats = statSync(join(this.path, file))
        return [page, `${file}-${stats.mtimeMs}-${stats.size}`]
      }),
    )
  }

  // The time that the page's file was last written, as an ISO time
  pageChangedTime(page: string): string {
    return statSync(join(this.path, fileOfPage(this.pageFiles(), page))).mtime.toISOString()
  }

  watchPadDb(): PadDbWatch {
    this.read(() => undefined)
    return new PadDbWatch(
      new DatabaseSync(join(this.path, padDbFile), { timeout: busyTimeoutMilliseconds }),
      this.name,
    )
  }

  readPage(page: string): PageLines {
    if (!isPagePath(page)) {
      return { file: page, lines: [] }
    }
    const file = fileOfPage(this.pageFiles(), page)
    const text = this.readFile(file)
    return { file, lines: text === undefined ? [] : text.split('\n') }
  }

  readPageLines(page: string): readonly string[] {
    return this.readPage(page).lines
  }

  readCustomFile(file: string): string | undefined {
    const path = join(this.path, file)
    return isCustomHtmlPath(file) && existsSync(path) && this.isCustomFile(realpathSync(path))
      ? readFileSync(path, 'utf8')
      : undefined
  }

  private isCustomFile(realPath: string): boolean {
    const realCustomFolder = join(realpathSync(this.path), customFolder)
    return (
      realpathSync(join(this.path, customFolder)) === realCustomFolder &&
      realPath.startsWith(`${realCustomFolder}${sep}`) &&
      statSync(realPath).isFile()
    )
  }

  private readFile(file: string): string | undefined {
    const path = join(this.path, file)
    return existsSync(path) ? readFileSync(path, 'utf8') : undefined
  }

  private build(indexPage: string, fill: (pad: PadDb) => void): void {
    mkdirSync(join(this.path, pagesFolder))
    writeFileSync(join(this.path, pagesFolder, 'index.md'), indexPage)
    this.usePadDb((db) => {
      db.exec('PRAGMA journal_mode = WAL')
      this.inTransaction(db, 'BEGIN IMMEDIATE', (pad) => {
        db.exec(newPadDbSql(this.schema))
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
      this.attachStoredPages(db)
      return use(db)
    })
  }

  private attachStoredPages(db: DatabaseSync): void {
    if (this.storedPageIds(db).length === 0) {
      return
    }
    db.exec('BEGIN IMMEDIATE')
    rolledBackOnError(db, () =>
      this.storedPageIds(db).forEach(({ stored, page }) => {
        db.prepare('UPDATE threads SET page = ? WHERE page = ?').run(page, stored)
        db.prepare('UPDATE decisions SET page = ? WHERE page = ?').run(page, stored)
        db.prepare('UPDATE outbox SET page = ? WHERE page = ?').run(page, stored)
      }),
    )
    db.exec('COMMIT')
  }

  private storedPageIds(db: DatabaseSync): StoredPageId[] {
    const stored = readSavedValues(
      db,
      this.name,
      'threads',
      `SELECT page FROM threads UNION SELECT page FROM decisions
       UNION SELECT page FROM outbox WHERE page IS NOT NULL`,
    ).map((row) => row.text('page'))
    return storedPageIds(stored, this.pageFiles())
  }

  private usePadDb<T>(use: (db: DatabaseSync) => T): T {
    try {
      const db = new DatabaseSync(join(this.path, padDbFile), { timeout: busyTimeoutMilliseconds })
      try {
        return use(db)
      } catch (error) {
        throw this.damageOrError(db, error)
      } finally {
        db.close()
      }
    } catch (error) {
      throw padDbErrorFrom(error, this.name)
    }
  }

  private damageOrError(db: DatabaseSync, error: unknown): unknown {
    if (!(padDbErrorFrom(error, this.name) instanceof PadDbFailureError)) {
      return error
    }
    const [damage] = readSavedValues(
      db,
      this.name,
      'pragma_quick_check',
      'SELECT quick_check FROM pragma_quick_check()',
    )
      .map((result) => result.text('quick_check'))
      .filter((result) => result !== 'ok')
    return damage === undefined ? error : new BrokenPadDbError(this.name, damage)
  }

  private checkPadDb(db: DatabaseSync): void {
    const version = this.schemaVersion(db)
    if (version > this.schema.version) {
      throw new NewerPadDbError(this.name, version, this.schema.version)
    }
    if (version < 1) {
      throw new BrokenPadDbError(this.name, "it doesn't contain the tables of a scratch pad")
    }
    if (version < this.schema.version) {
      this.migrate(db)
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

  private migrate(db: DatabaseSync): void {
    db.exec('BEGIN IMMEDIATE')
    rolledBackOnError(db, () => {
      const version = this.schemaVersion(db)
      db.exec(padMigrationsAfter(this.schema, version))
      const pages = this.pageMarkdowns()
      padMigrationFillsAfter(this.schema, version).forEach((fill) =>
        fill(new PadDb(db, this.name), pages),
      )
    })
    db.exec('COMMIT')
  }

  private pageMarkdowns(): PageMarkdown[] {
    return this.pages().map((page) => ({ page, markdown: this.readPageLines(page).join('\n') }))
  }

  private schemaVersion(db: DatabaseSync): number {
    const versions = readSavedValues(
      db,
      this.name,
      'pragma_user_version',
      'SELECT user_version FROM pragma_user_version()',
    ).map((result) => result.wholeNumber('user_version'))
    return Math.max(0, ...versions)
  }

  private inTransaction<T>(db: DatabaseSync, begin: string, work: (pad: PadDb) => T): T {
    db.exec(begin)
    const result = rolledBackOnError(db, () => work(new PadDb(db, this.name)))
    db.exec('COMMIT')
    return result
  }
}

function fileOfPage(files: readonly PageFile[], page: string): string {
  return files.find((file) => file.page === page)?.file ?? page
}

function rolledBackOnError<T>(db: DatabaseSync, work: () => T): T {
  try {
    return work()
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}
