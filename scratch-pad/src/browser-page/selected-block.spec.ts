import { afterEach, describe, expect, it } from 'vitest'
import { selectedBlockText, wholeBlockSelection } from './selected-block'

function pageText(): HTMLElement {
  const article = document.createElement('article')
  article.innerHTML = [
    '<p data-lines="3-4">The export job <strong>retries 5</strong> times.</p>',
    '<p data-lines="6-6">The job writes one file.</p>',
    '<div data-lines="8-12"><button type="button">Proposal</button></div>',
    '<p data-lines="14">A block with broken lines.</p>',
  ].join('')
  document.body.append(article)
  return article
}

function select(start: Node, startOffset: number, end: Node, endOffset: number): Selection {
  const selection = document.getSelection() ?? new Selection()
  const range = document.createRange()
  range.setStart(start, startOffset)
  range.setEnd(end, endOffset)
  selection.removeAllRanges()
  selection.addRange(range)
  return selection
}

function textIn(article: HTMLElement, selector: string): Node {
  return article.querySelector(selector)?.firstChild ?? article
}

afterEach(() => {
  document.getSelection()?.removeAllRanges()
  document.body.replaceChildren()
})

describe('selectedBlockText', () => {
  it('returns the lines of the block, the selected text and where the selection is when Nick selects text in one block', () => {
    const article = pageText()
    const selection = select(textIn(article, 'p'), 15, textIn(article, 'strong'), 9)
    expect(selectedBlockText(selection, article)).toStrictEqual({
      lines: '3-4',
      firstLine: 3,
      lastLine: 4,
      selectedText: 'retries 5',
      prefix: 'The export job',
      suffix: 'times.',
      occurrence: 0,
      top: 300,
      centre: 200,
    })
  })

  it('finds the block when the selection starts at the block element itself', () => {
    const article = pageText()
    const block = article.querySelector('[data-lines="6-6"]') ?? article
    const selection = select(block, 0, block.firstChild ?? block, 7)
    expect(selectedBlockText(selection, article)?.selectedText).toBe('The job')
  })

  it('keeps the last and the first 32 characters as the text around the selection when the block is long', () => {
    const article = document.createElement('article')
    article.innerHTML =
      '<p data-lines="1-1">The export job writes every paid invoice of a shop. It retries 5 times when the network of the shop is slow at night.</p>'
    document.body.append(article)
    const text = textIn(article, 'p')
    const selection = select(text, 52, text, 67)
    expect(selectedBlockText(selection, article)).toMatchObject({
      selectedText: 'It retries 5 ti',
      prefix: 'writes every paid invoice of a shop.'.slice(-32),
      suffix: 'mes when the network of the shop',
    })
  })

  it('counts the earlier copies of the selected text in the block when Nick selects a later copy', () => {
    const article = document.createElement('article')
    article.innerHTML =
      '<p data-lines="3-3">The job retries the shop. Then the job retries the shop again.</p>'
    document.body.append(article)
    const text = textIn(article, 'p')
    const selection = select(text, 35, text, 55)
    expect(selectedBlockText(selection, article)).toMatchObject({
      selectedText: 'job retries the shop',
      occurrence: 1,
    })
  })

  it('returns the lines of the block without any selected text when Nick comments on the whole block', () => {
    expect(wholeBlockSelection('8-12')).toStrictEqual({
      lines: '8-12',
      firstLine: 8,
      lastLine: 12,
      selectedText: '',
      prefix: '',
      suffix: '',
      occurrence: 0,
    })
    expect(wholeBlockSelection('14')).toBeUndefined()
  })

  it('returns nothing when the selection goes over 2 blocks', () => {
    const article = pageText()
    const selection = select(textIn(article, 'p'), 4, textIn(article, '[data-lines="6-6"]'), 3)
    expect(selectedBlockText(selection, article)).toBeUndefined()
  })

  it('returns nothing when the selection is only whitespace or inside a button', () => {
    const article = pageText()
    expect(
      selectedBlockText(select(textIn(article, 'p'), 3, textIn(article, 'p'), 4), article),
    ).toBeUndefined()
    expect(
      selectedBlockText(
        select(textIn(article, 'button'), 0, textIn(article, 'button'), 4),
        article,
      ),
    ).toBeUndefined()
  })

  it('returns nothing when the block has broken lines or isn’t in the page', () => {
    const article = pageText()
    const broken = textIn(article, '[data-lines="14"]')
    expect(selectedBlockText(select(broken, 0, broken, 7), article)).toBeUndefined()
    const outside = document.createElement('p')
    outside.textContent = 'Outside the page'
    document.body.append(outside)
    expect(
      selectedBlockText(
        select(outside.firstChild ?? outside, 0, outside.firstChild ?? outside, 7),
        article,
      ),
    ).toBeUndefined()
  })

  it('returns nothing when nothing is selected or the page isn’t shown', () => {
    const article = pageText()
    expect(selectedBlockText(document.getSelection(), article)).toBeUndefined()
    expect(selectedBlockText(null, article)).toBeUndefined()
    expect(selectedBlockText(document.getSelection(), null)).toBeUndefined()
  })
})
