import { describe, expect, it } from 'vitest'
import { headingIdOf, slugOf } from './slug'

describe('slugOf', () => {
  it('returns the words in lower case with dashes when the text has spaces and punctuation', () => {
    expect(slugOf('  Invoice Template: v2! ')).toBe('invoice-template-v2')
  })

  it('returns the letter without the accent when a letter has an accent', () => {
    expect(slugOf('Café menü à la carte')).toBe('cafe-menu-a-la-carte')
  })

  it('returns the Latin spelling of each letter when a letter has no decomposition', () => {
    expect(slugOf('Straße Æble Øre Œuvre Łódź Đakovo Þing')).toBe(
      'strasse-aeble-ore-oeuvre-lodz-dakovo-thing',
    )
  })

  it('returns an empty text when the text has neither Latin letters nor digits', () => {
    expect(slugOf('日本 !!!')).toBe('')
  })
})

describe('headingIdOf', () => {
  it('returns the Latin letters without their accents in lower case with dashes when the heading is in a Latin script', () => {
    expect(headingIdOf('Größe der Rechnung: Café')).toBe('grosse-der-rechnung-cafe')
  })

  it('keeps the letters and the digits when the heading is in another script', () => {
    expect(headingIdOf('請求書 2 の税番号')).toBe('請求書-2-の税番号')
  })

  it('keeps the vowel signs when the heading is in a script that writes vowels as marks', () => {
    expect(headingIdOf('चालान की सीमा')).toBe('चालान-की-सीमा')
  })
})
