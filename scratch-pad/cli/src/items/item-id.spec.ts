import { describe, expect, it } from 'vitest'
import { InvalidItemIdError, itemTypeNoun, itemTypeOf, nextItemId } from './item-id'

describe('nextItemId', () => {
  it('returns c-1 when there is no comment yet', () => {
    expect(nextItemId('comment', [])).toBe('c-1')
  })

  it('returns the highest number of the type plus 1 when ids of several types exist', () => {
    expect(nextItemId('grammar', ['g-2', 'c-7', 'g-10', 'i-11'])).toBe('g-11')
  })

  it('returns d-1 for the first decision', () => {
    expect(nextItemId('decision', ['c-1'])).toBe('d-1')
  })
})

describe('itemTypeOf', () => {
  it.each([
    ['c-12', 'comment'],
    ['d-3', 'decision'],
    ['g-1', 'grammar'],
    ['i-40', 'improvement'],
  ])('returns the type of %s', (id, type) => {
    expect(itemTypeOf(id)).toBe(type)
  })

  it.each(['x-1', 'c-0', 'c-', 'c-1/../x', 'C-1', ''])(
    'throws InvalidItemIdError when the id is %j',
    (id) => {
      expect(() => itemTypeOf(id)).toThrow(InvalidItemIdError)
      expect(() => itemTypeOf(id)).toThrow(`"${id}" isn't an id. An id looks like c-1`)
    },
  )
})

describe('itemTypeNoun', () => {
  it.each([
    ['comment', 'comment'],
    ['decision', 'decision'],
    ['grammar', 'grammar note'],
    ['improvement', 'improvement note'],
  ] as const)('names a %s as %s', (type, noun) => {
    expect(itemTypeNoun(type)).toBe(noun)
  })
})
