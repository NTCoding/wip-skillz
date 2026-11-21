import { describe, expect, it } from 'vitest'
import { isUnderNumber, pageFileOf, pageFilesInOrder, parentNumberOf } from './page-files'

describe('pageFileOf', () => {
  it.each([
    ['pages/1-comment-on-the-export.md', 'pages/comment-on-the-export.md', '1'],
    ['pages/1.1-evidence.md', 'pages/evidence.md', '1.1'],
    ['pages/1.10.2-raw-logs.md', 'pages/raw-logs.md', '1.10.2'],
    ['pages/index.md', 'pages/index.md', undefined],
    ['pages/retry-limit.md', 'pages/retry-limit.md', undefined],
    ['pages/1.-evidence.md', 'pages/1.-evidence.md', undefined],
    ['pages/1-.md', 'pages/1-.md', undefined],
  ])('reads %s as the page %s with the number %s', (file, page, number) => {
    expect(pageFileOf(file)).toStrictEqual({ page, file, number })
  })
})

describe('pageFilesInOrder', () => {
  it('lists the index page first, then the numbered pages by their numbers and then the other pages by file name', () => {
    const files = [
      'pages/zebra.md',
      'pages/2-board-edge.md',
      'pages/1.10-later.md',
      'pages/apple.md',
      'pages/1.2-evidence.md',
      'pages/1-comment.md',
      'pages/index.md',
      'pages/1.2.1-raw-logs.md',
    ].map(pageFileOf)

    expect(pageFilesInOrder(files).map((file) => file.file)).toStrictEqual([
      'pages/index.md',
      'pages/1-comment.md',
      'pages/1.2-evidence.md',
      'pages/1.2.1-raw-logs.md',
      'pages/1.10-later.md',
      'pages/2-board-edge.md',
      'pages/apple.md',
      'pages/zebra.md',
    ])
  })

  it('orders 2 files by file name when they have the same number', () => {
    const files = ['pages/1-board.md', 'pages/1-apple.md'].map(pageFileOf)

    expect(pageFilesInOrder(files).map((file) => file.file)).toStrictEqual([
      'pages/1-apple.md',
      'pages/1-board.md',
    ])
  })
})

describe('parentNumberOf', () => {
  it.each([
    ['1.1', '1'],
    ['1.2.3', '1.2'],
    ['1', undefined],
    [undefined, undefined],
  ])('returns the parent number of %s as %s', (number, parent) => {
    expect(parentNumberOf(number)).toBe(parent)
  })
})

describe('isUnderNumber', () => {
  it.each([
    ['1.1', '1', true],
    ['1.1.1', '1', true],
    ['10.1', '1', false],
    ['1', '1', false],
    [undefined, '1', false],
    ['1.1', undefined, false],
  ])('returns whether %s is under %s as %s', (number, parent, under) => {
    expect(isUnderNumber(number, parent)).toBe(under)
  })
})
