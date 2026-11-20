import { describe, expect, it } from 'vitest'
import { slugOf } from './slug'

describe('slugOf', () => {
  it('returns the words in lower case with dashes when the text has spaces and punctuation', () => {
    expect(slugOf('  Invoice Template: v2! ')).toBe('invoice-template-v2')
  })

  it('returns the letter without the accent when a letter has an accent', () => {
    expect(slugOf('Café menü à la carte')).toBe('cafe-menu-a-la-carte')
  })

  it('returns an empty text when the text has neither letters nor digits', () => {
    expect(slugOf('日本 !!!')).toBe('')
  })
})
