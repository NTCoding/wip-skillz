import { describe, expect, it } from 'vitest'
import { BrokenPadDbError } from './pad-db-errors'
import { readSavedValues, SavedValues } from './saved-values'
import { exportJobPadName, inMemoryPadDb } from './scratch-pad-folder-fixtures'

const saved = (values: Record<string, string | number | null>) =>
  new SavedValues(values, 'threads', exportJobPadName)

const broken = (problem: string) =>
  `pad.db in 2026-03-14-export-job is broken: ${problem}. Nothing was saved. Tell Nick, because the threads, the decisions and the progress tracker of the scratch pad are in pad.db.`

describe('SavedValues', () => {
  it('returns the text when the column is a text', () => {
    expect(saved({ page: 'pages/index.md' }).text('page')).toBe('pages/index.md')
  })

  it('throws BrokenPadDbError that names the column and the table when a text is a number', () => {
    const read = () => saved({ page: 5 }).text('page')

    expect(read).toThrow(BrokenPadDbError)
    expect(read).toThrow(broken('the column page of the table threads must be a text'))
  })

  it('returns undefined for an optional text when the column is null', () => {
    expect(saved({ outcome: null }).optionalText('outcome')).toBeUndefined()
  })

  it('returns the optional text when the column is set', () => {
    expect(saved({ outcome: 'Fixed.' }).optionalText('outcome')).toBe('Fixed.')
  })

  it('returns the whole number when the column is a whole number', () => {
    expect(saved({ line: 9 }).wholeNumber('line')).toBe(9)
  })

  it.each([9.5, '9', null])('throws BrokenPadDbError when a whole number is %j', (line) => {
    const read = () => saved({ line }).wholeNumber('line')

    expect(read).toThrow(BrokenPadDbError)
    expect(read).toThrow(broken('the column line of the table threads must be a whole number'))
  })

  it('returns undefined for an optional whole number when the column is null', () => {
    expect(saved({ first_line: null }).optionalWholeNumber('first_line')).toBeUndefined()
  })

  it('returns the optional whole number when the column is set', () => {
    expect(saved({ first_line: 5 }).optionalWholeNumber('first_line')).toBe(5)
  })

  it('returns the value when the value is allowed', () => {
    expect(saved({ waits_for: 'nick' }).oneOf('waits_for', ['nick', 'agent'])).toBe('nick')
  })

  it('throws BrokenPadDbError that lists the allowed values when the value is not allowed', () => {
    const read = () => saved({ waits_for: 'everyone' }).oneOf('waits_for', ['nick', 'agent'])

    expect(read).toThrow(BrokenPadDbError)
    expect(read).toThrow(
      broken('the column waits_for of the table threads must be one of nick, agent'),
    )
  })
})

describe('readSavedValues', () => {
  it('names the table in the error when a value of a row is wrong', () => {
    const read = () =>
      readSavedValues(inMemoryPadDb(), exportJobPadName, 'tasks', "SELECT 'one' AS number").map(
        (task) => task.wholeNumber('number'),
      )

    expect(read).toThrow(BrokenPadDbError)
    expect(read).toThrow(broken('the column number of the table tasks must be a whole number'))
  })
})
