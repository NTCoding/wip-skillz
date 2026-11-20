import { type SQLOutputValue } from 'node:sqlite'
import { ScratchPadError } from '../scratch-pad-error'

export class BrokenPadDbError extends ScratchPadError {
  constructor(padName: string, problem: string) {
    super(
      `pad.db in ${padName} is broken: ${problem}. Nothing was saved. Tell Nick, because the threads, the decisions and the progress tracker of the scratch pad are in pad.db.`,
    )
  }
}

export class PadRow {
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

  flag(column: string): boolean {
    return this.oneOf(column, [0, 1]) === 1
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
