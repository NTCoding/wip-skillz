import { describe, expect, it } from 'vitest'
import { QuoteEditCosts } from './quote-edit-costs'

describe('QuoteEditCosts', () => {
  it('returns 0 when the text contains the quote', () => {
    expect(new QuoteEditCosts('retries').lowestCostIn('The job retries 5 times.')).toBe(0)
  })

  it('returns the edits of the closest part of the text when one letter differs', () => {
    expect(new QuoteEditCosts('retries 5 times').lowestCostIn('It retries 8 times.')).toBe(1)
  })

  it('returns the length of the quote when the text is empty', () => {
    expect(new QuoteEditCosts('retries').lowestCostIn('')).toBe(7)
  })

  it('returns the edits of the closest part when the quote is longer than 32 letters', () => {
    const quote = 'The export job retries a failed shop 5 times when the network is slow.'
    const text = `Every night. ${quote.replace('5 times', '8 times').replace('slow', 'down')}`
    expect(new QuoteEditCosts(quote).lowestCostIn(text)).toBe(4)
  })

  it('returns the same edits again when a second text is searched with the same quote', () => {
    const costs = new QuoteEditCosts('invoice template')
    expect([costs.lowestCostIn('The invoice templates.'), costs.lowestCostIn('x')]).toStrictEqual([
      0, 16,
    ])
  })
})
