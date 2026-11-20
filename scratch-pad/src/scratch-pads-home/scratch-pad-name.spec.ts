import { describe, expect, it } from 'vitest'
import { EmptyTopicError, scratchPadFolderName, scratchPadTitle } from './scratch-pad-name'

const today = new Date(2026, 2, 4, 9, 30)

describe('scratchPadFolderName', () => {
  it('starts with the local date and ends with the topic in lower case with dashes', () => {
    expect(scratchPadFolderName('  Invoice Template: v2! ', today)).toBe(
      '2026-03-04-invoice-template-v2',
    )
  })

  it('keeps each letter without its accent when the topic has accented letters', () => {
    expect(scratchPadFolderName('Café menü', today)).toBe('2026-03-04-cafe-menu')
  })

  it('cuts the topic to 60 characters when the topic is longer', () => {
    expect(scratchPadFolderName('x'.repeat(264), today)).toBe(`2026-03-04-${'x'.repeat(60)}`)
  })

  it('leaves out a dash at the end of the cut topic', () => {
    expect(scratchPadFolderName('retry limit '.repeat(22), today)).toBe(
      '2026-03-04-retry-limit-retry-limit-retry-limit-retry-limit-retry-limit',
    )
  })

  it.each(['', '!!!', '日本'])('throws EmptyTopicError when the topic is %j', (topic) => {
    expect(() => scratchPadFolderName(topic, today)).toThrow(EmptyTopicError)
    expect(() => scratchPadFolderName(topic, today)).toThrow(`"${topic}" can't be a folder name.`)
  })
})

describe('scratchPadTitle', () => {
  it('writes the trimmed topic with a capital letter', () => {
    expect(scratchPadTitle('  retry limit ')).toBe('Retry limit')
  })
})
