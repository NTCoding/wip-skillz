import { describe, expect, it } from 'vitest'
import { BrokenFileError, JsonFields } from './json-fields'

const fields = (value: unknown) => JsonFields.from(value, 'threads/c-1.json')

describe('JsonFields', () => {
  it('throws BrokenFileError when the text is not JSON', () => {
    const parse = () => JsonFields.parse('{ "id": ', 'threads/c-1.json')

    expect(parse).toThrow(BrokenFileError)
    expect(parse).toThrow(
      "threads/c-1.json is broken: it isn't valid JSON. Fix the file by hand or delete it.",
    )
  })

  it.each([null, [], 'text'])('throws BrokenFileError when the JSON is %j', (value) => {
    expect(() => fields(value)).toThrow(BrokenFileError)
    expect(() => fields(value)).toThrow('threads/c-1.json is broken: it must contain a JSON object')
  })

  it('reads a text', () => {
    expect(fields({ id: 'c-1' }).text('id')).toBe('c-1')
  })

  it('throws BrokenFileError that names the field when a text is missing', () => {
    expect(() => fields({}).text('id')).toThrow(BrokenFileError)
    expect(() => fields({}).text('id')).toThrow('threads/c-1.json is broken: "id" must be a text')
  })

  it('returns undefined when an optional text is missing', () => {
    expect(fields({}).optionalText('outcome')).toBeUndefined()
  })

  it('reads a whole number', () => {
    expect(fields({ line: 9 }).wholeNumber('line')).toBe(9)
  })

  it.each([9.5, '9'])('throws BrokenFileError when a whole number is %j', (line) => {
    expect(() => fields({ line }).wholeNumber('line')).toThrow(BrokenFileError)
    expect(() => fields({ line }).wholeNumber('line')).toThrow('"line" must be a whole number')
  })

  it('reads a flag', () => {
    expect(fields({ seenByAgent: false }).flag('seenByAgent')).toBe(false)
  })

  it('throws BrokenFileError when a flag is not true or false', () => {
    const read = () => fields({ seenByAgent: 'no' }).flag('seenByAgent')

    expect(read).toThrow(BrokenFileError)
    expect(read).toThrow('"seenByAgent" must be true or false')
  })

  it('reads one of the allowed values', () => {
    expect(fields({ waitsFor: 'nick' }).oneOf('waitsFor', ['nick', 'agent'])).toBe('nick')
  })

  it('throws BrokenFileError that lists the allowed values when the value is not allowed', () => {
    const read = () => fields({ waitsFor: 'bob' }).oneOf('waitsFor', ['nick', 'agent'])

    expect(read).toThrow(BrokenFileError)
    expect(read).toThrow('"waitsFor" must be one of nick, agent')
  })

  it('throws BrokenFileError when an object is not an object', () => {
    expect(() => fields({ anchor: [] }).object('anchor')).toThrow(BrokenFileError)
    expect(() => fields({ anchor: [] }).object('anchor')).toThrow('"anchor" must be an object')
  })

  it('reads an optional object with the given reader', () => {
    expect(
      fields({ anchor: { firstLine: 3 } }).optionalObject('anchor', (anchor) =>
        anchor.wholeNumber('firstLine'),
      ),
    ).toBe(3)
  })

  it('returns undefined when an optional object is missing', () => {
    expect(fields({}).optionalObject('anchor', (anchor) => anchor.text('x'))).toBeUndefined()
  })

  it('reads a list of objects with the given reader', () => {
    expect(
      fields({ messages: [{ text: 'a' }, { text: 'b' }] }).objects('messages', (entry) =>
        entry.text('text'),
      ),
    ).toStrictEqual(['a', 'b'])
  })

  it('throws BrokenFileError when a list is not a list', () => {
    const read = () => fields({ messages: {} }).objects('messages', (entry) => entry.text('text'))

    expect(read).toThrow(BrokenFileError)
    expect(read).toThrow('"messages" must be a list')
  })

  it('reads a list of objects that has at least one entry', () => {
    expect(
      fields({ messages: [{ text: 'a' }] }).nonEmptyObjects('messages', (entry) =>
        entry.text('text'),
      ),
    ).toStrictEqual(['a'])
  })

  it('throws BrokenFileError when a list that needs an entry is empty', () => {
    const read = () => fields({ messages: [] }).nonEmptyObjects('messages', (entry) => entry)

    expect(read).toThrow(BrokenFileError)
    expect(read).toThrow('"messages" must be a list with at least one entry')
  })
})
