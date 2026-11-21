import { describe, expect, it } from 'vitest'
import { countedNoun, listOfCounts } from './counted-noun'

describe('countedNoun', () => {
  it('uses the singular when the count is 1', () => {
    expect(countedNoun(1, 'comment')).toBe('1 comment')
  })

  it('adds an s when the count is 0', () => {
    expect(countedNoun(0, 'comment')).toBe('0 comments')
  })

  it('uses the given plural when the plural is irregular', () => {
    expect(countedNoun(2, 'reply', 'replies')).toBe('2 replies')
  })
})

describe('listOfCounts', () => {
  it('returns nothing when there are no counts', () => {
    expect(listOfCounts([])).toBe('nothing')
  })

  it('joins the counts with commas when there are several counts', () => {
    expect(listOfCounts(['1 comment', '2 decisions'])).toBe('1 comment, 2 decisions')
  })
})
