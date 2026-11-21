import { type DatabaseSync, type SQLInputValue, type SQLOutputValue } from 'node:sqlite'
import { BrokenPadDbError } from './pad-db-errors'

export class SavedValues {
  constructor(
    private readonly values: Readonly<Record<string, SQLOutputValue>>,
    private readonly table: string,
    private readonly padName: string,
  ) {}

  text(column: string): string {
    const value = this.values[column]
    if (typeof value === 'string') {
      return value
    }
    throw this.problem(column, 'a text')
  }

  optionalText(column: string): string | undefined {
    return this.values[column] === null ? undefined : this.text(column)
  }

  wholeNumber(column: string): number {
    const value = this.values[column]
    if (typeof value === 'number' && Number.isInteger(value)) {
      return value
    }
    throw this.problem(column, 'a whole number')
  }

  optionalWholeNumber(column: string): number | undefined {
    return this.values[column] === null ? undefined : this.wholeNumber(column)
  }

  oneOf<T extends string | number>(column: string, allowed: readonly T[]): T {
    const value = this.values[column]
    const match = allowed.find((candidate) => candidate === value)
    if (match === undefined) {
      throw this.problem(column, `one of ${allowed.join(', ')}`)
    }
    return match
  }

  private problem(column: string, expected: string): BrokenPadDbError {
    return new BrokenPadDbError(
      this.padName,
      `the column ${column} of the table ${this.table} must be ${expected}`,
    )
  }
}

export function readSavedValues(
  db: DatabaseSync,
  padName: string,
  table: string,
  sql: string,
  ...parameters: SQLInputValue[]
): SavedValues[] {
  return db
    .prepare(sql)
    .all(...parameters)
    .map((values) => new SavedValues(values, table, padName))
}
