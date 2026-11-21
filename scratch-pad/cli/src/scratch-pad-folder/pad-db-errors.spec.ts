import { describe, expect, it } from 'vitest'
import { EmptyTaskTitleError } from '../progress-tracker/progress-tracker'
import { ScratchPadError } from '../scratch-pad-error'
import {
  BrokenPadDbError,
  BusyPadDbError,
  PadDbFailureError,
  padDbErrorFrom,
} from './pad-db-errors'
import { exportJobPadName } from './scratch-pad-folder-fixtures'

class FakeSqliteError extends ScratchPadError {
  constructor(readonly errcode: number) {
    super('database is locked')
  }
}

describe('padDbErrorFrom', () => {
  it.each([
    ['BusyPadDbError', 5, BusyPadDbError],
    ['BusyPadDbError', 6, BusyPadDbError],
    ['BusyPadDbError', 262, BusyPadDbError],
    ['BusyPadDbError', 517, BusyPadDbError],
    ['BrokenPadDbError', 11, BrokenPadDbError],
    ['BrokenPadDbError', 26, BrokenPadDbError],
    ['BrokenPadDbError', 779, BrokenPadDbError],
    ['PadDbFailureError', 1, PadDbFailureError],
    ['PadDbFailureError', 8, PadDbFailureError],
    ['PadDbFailureError', 275, PadDbFailureError],
  ])('returns %s when the SQLite code is %j', (_name, code, errorClass) => {
    expect(padDbErrorFrom(new FakeSqliteError(code), exportJobPadName)).toBeInstanceOf(errorClass)
  })

  it('returns the error unchanged when the error does not come from SQLite', () => {
    const error = new EmptyTaskTitleError()
    expect(padDbErrorFrom(error, exportJobPadName)).toBe(error)
  })
})
