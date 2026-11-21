import { describe, expect, it } from 'vitest'
import { selectionsAround, visibleBlockTexts } from '../browser-page/visible-text-fixtures'
import { contextAfter, contextBefore } from './anchor-context'

describe('contextBefore and contextAfter', () => {
  it('cut the same text around the selection as the browser when the selection is in each kind of block', () => {
    const around = selectionsAround.map(({ lines, selectedText }) => {
      const text = String(visibleBlockTexts[lines])
      const start = text.indexOf(selectedText)
      return {
        lines,
        selectedText,
        prefix: contextBefore(text.slice(0, start)),
        suffix: contextAfter(text.slice(start + selectedText.length)),
      }
    })
    expect(around).toStrictEqual(selectionsAround)
  })

  it('keeps an emoji whole when the 32 characters end in the middle of it', () => {
    expect(contextBefore(`🎉${'a'.repeat(31)}`)).toBe(`🎉${'a'.repeat(31)}`)
  })
})
