import { describe, expect, it } from 'vitest'
import { BrokenPadDbError, PadRow } from './pad-row'

const row = (values: Record<string, string | number | null>) =>
  new PadRow(values, 'threads', '2026-03-14-export-job')

const broken = (problem: string) =>
  `pad.db in 2026-03-14-export-job is broken: ${problem}. Nothing was saved. Tell Nick, because the threads, the decisions and the progress tracker of the scratch pad are in pad.db.`

describe('PadRow', () => {
  it('returns a text', () => {
    expect(row({ page: 'pages/index.md' }).text('page')).toBe('pages/index.md')
  })

  it('throws BrokenPadDbError that names the column and the table when a text is a number', () => {
    const read = () => row({ page: 5 }).text('page')

    expect(read).toThrow(BrokenPadDbError)
    expect(read).toThrow(broken('the column page of the table threads must be a text'))
  })

  it('returns undefined for an optional text that is null', () => {
    expect(row({ outcome: null }).optionalText('outcome')).toBeUndefined()
  })

  it('returns an optional text that is set', () => {
    expect(row({ outcome: 'Fixed.' }).optionalText('outcome')).toBe('Fixed.')
  })

  it('returns a whole number', () => {
    expect(row({ line: 9 }).wholeNumber('line')).toBe(9)
  })

  it.each([9.5, '9', null])('throws BrokenPadDbError when a whole number is %j', (line) => {
    const read = () => row({ line }).wholeNumber('line')

    expect(read).toThrow(BrokenPadDbError)
    expect(read).toThrow(broken('the column line of the table threads must be a whole number'))
  })

  it('returns undefined for an optional whole number that is null', () => {
    expect(row({ first_line: null }).optionalWholeNumber('first_line')).toBeUndefined()
  })

  it('returns an optional whole number that is set', () => {
    expect(row({ first_line: 5 }).optionalWholeNumber('first_line')).toBe(5)
  })

  it.each([
    [1, true],
    [0, false],
  ])('reads the flag %j as %j', (value, flag) => {
    expect(row({ seen: value }).flag('seen')).toBe(flag)
  })

  it('throws BrokenPadDbError when a flag is neither 0 nor 1', () => {
    const read = () => row({ seen: 2 }).flag('seen')

    expect(read).toThrow(BrokenPadDbError)
    expect(read).toThrow(broken('the column seen of the table threads must be one of 0, 1'))
  })

  it('returns a value that is allowed', () => {
    expect(row({ waits_for: 'nick' }).oneOf('waits_for', ['nick', 'agent'])).toBe('nick')
  })

  it('throws BrokenPadDbError that lists the allowed values when the value is not allowed', () => {
    const read = () => row({ waits_for: 'everyone' }).oneOf('waits_for', ['nick', 'agent'])

    expect(read).toThrow(BrokenPadDbError)
    expect(read).toThrow(
      broken('the column waits_for of the table threads must be one of nick, agent'),
    )
  })
})
