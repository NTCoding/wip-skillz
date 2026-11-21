import { describe, expect, it } from 'vitest'
import {
  allowedEdits,
  exactMatches,
  similarMatches,
  textSimilarity,
  wordBoundariesOf,
} from './quote-match'

function similarIn(quote: string, text: string) {
  return similarMatches(quote, text, wordBoundariesOf(text)).map((found) => ({
    text: text.slice(found.start, found.end),
    similarity: found.similarity,
  }))
}

describe('exactMatches', () => {
  it('returns every place of the quote when the text contains it twice', () => {
    expect(exactMatches('5 (retries)', 'Set 5 (retries) and 5 (retries).')).toStrictEqual([
      { start: 4, end: 15, similarity: 1 },
      { start: 20, end: 31, similarity: 1 },
    ])
  })

  it('returns nothing when the quote is empty or not in the text', () => {
    expect([exactMatches('', 'The export job'), exactMatches('import', 'The job')]).toStrictEqual([
      [],
      [],
    ])
  })
})

describe('allowedEdits', () => {
  it('returns a quarter of the length of the quote rounded down', () => {
    expect([allowedEdits('retries'), allowedEdits('retries 5 times')]).toStrictEqual([1, 3])
  })
})

describe('wordBoundariesOf', () => {
  it('marks the start and the end of each word, space and emoji when the text has them', () => {
    expect([...wordBoundariesOf('Job 🎉 ok')].join('')).toBe('1001101101')
  })
})

describe('similarMatches', () => {
  it('returns the changed word with its similarity when one letter differs', () => {
    expect(similarIn('retries 5 times', 'The job retries 8 times a night.')).toStrictEqual([
      { text: 'retries 8 times', similarity: 14 / 15 },
    ])
  })

  it('returns every similar text when the text has 2 of them', () => {
    expect(
      similarIn('3 times when slow', 'Berlin 5 times when slow Paris 4 times when slow'),
    ).toStrictEqual([
      { text: '5 times when slow', similarity: 16 / 17 },
      { text: '4 times when slow', similarity: 16 / 17 },
    ])
  })

  it('returns the whole word when the end of the similar text is in the middle of a word', () => {
    expect(similarIn('Retry policy', 'Retry policies')).toStrictEqual([
      { text: 'Retry policies', similarity: 11 / 14 },
    ])
  })

  it('returns the longest end when a shorter end costs the same', () => {
    expect(similarIn('const retries = 5', 'const retries = 8 const wait = 30')).toStrictEqual([
      { text: 'const retries = 8', similarity: 16 / 17 },
    ])
  })

  it('returns the whole emoji when the emoji at the end of the quote changes', () => {
    expect(similarIn('party in Zürich 🎉', 'The party in Zürich 🎊 starts.')).toStrictEqual([
      { text: 'party in Zürich 🎊', similarity: 17 / 18 },
    ])
  })

  it('returns nothing when the closest text is less than 75% similar', () => {
    expect(similarIn('export job', 'The exporting job runs.')).toStrictEqual([])
  })
})

describe('textSimilarity', () => {
  it('returns 1 when both texts are empty', () => {
    expect(textSimilarity('', '')).toBe(1)
  })

  it('returns the share of the letters that stay when one letter changes', () => {
    expect(textSimilarity('retry', 'retro')).toBe(0.8)
  })

  it('returns 0 when one text is empty', () => {
    expect(textSimilarity('', 'shop')).toBe(0)
  })
})
