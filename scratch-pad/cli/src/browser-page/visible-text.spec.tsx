import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { exportPadAddresses, indexPage } from './browser-page-fixtures'
import { pageElements, parsedPageBody } from './page-elements'
import { selectedBlockText } from './selected-block'
import { selectedTextIn } from './text-highlights'
import { visibleTextOf } from './visible-text'
import {
  selectionsAround,
  visibleBlockTexts,
  visibleTextHtml,
  type SelectionAround,
} from './visible-text-fixtures'

function renderedArticle(): HTMLElement {
  const page = { ...indexPage, html: visibleTextHtml, links: [], decisions: [] }
  const context = {
    addresses: exportPadAddresses,
    page,
    onNavigate: () => undefined,
    loadPreview: () => Promise.resolve(undefined),
    findTask: () => undefined,
    onAnswerDecision: () => Promise.resolve(),
    onCommentOnBlock: () => undefined,
    answersOnThisPage: new Map(),
  }
  const { container } = render(
    <article>{pageElements(context, parsedPageBody(page.html), new Map())}</article>,
  )
  return container.querySelector('article') ?? container
}

function normalisedText(text: string): string {
  return text.replaceAll(/\s+/g, ' ').trim()
}

function wholeBlockText(block: Element): string {
  const range = document.createRange()
  range.selectNodeContents(block)
  return normalisedText(visibleTextOf(block, range))
}

function selectText(block: Element, selectedText: string): void {
  const spans = selectedTextIn(block, selectedText) ?? []
  const range = document.createRange()
  spans.slice(0, 1).forEach((first) => range.setStart(first.node, first.start))
  spans.slice(-1).forEach((last) => range.setEnd(last.node, last.end))
  document.getSelection()?.removeAllRanges()
  document.getSelection()?.addRange(range)
}

function selectionIn(article: HTMLElement, expected: SelectionAround): SelectionAround {
  selectText(
    article.querySelector(`[data-lines="${expected.lines}"]`) ?? article,
    expected.selectedText,
  )
  const selected = selectedBlockText(document.getSelection(), article)
  return {
    lines: String(selected?.lines),
    selectedText: String(selected?.selectedText),
    prefix: String(selected?.prefix),
    suffix: String(selected?.suffix),
  }
}

describe('visibleTextOf', () => {
  it('returns the same text as the server for each block when the page has a table, lists, code and a quote', () => {
    const article = renderedArticle()
    const texts = Object.fromEntries(
      [...article.children].map((block) => [
        String(block.getAttribute('data-lines')),
        wholeBlockText(block),
      ]),
    )
    expect(texts).toStrictEqual(visibleBlockTexts)
  })

  it('returns the same selected text and text around it as the server when Nick selects text in each kind of block', () => {
    const article = renderedArticle()
    expect(selectionsAround.map((expected) => selectionIn(article, expected))).toStrictEqual(
      selectionsAround,
    )
  })
})
