import { describe, expect, it } from 'vitest'
import {
  isUnderNumber,
  nextSubPageNumber,
  pageFileOf,
  pageFilesInOrder,
  parentNumberOf,
  storedPageIds,
} from './page-files'

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
    expect(pageFileOf(file)).toStrictEqual({ page, file, number, hasLeadingZero: false })
  })

  it.each([
    ['pages/01.1-evidence.md', '1.1'],
    ['pages/1.002-evidence.md', '1.2'],
    ['pages/00-evidence.md', '0'],
  ])('reads %s with the number %s without its leading zeros', (file, number) => {
    expect(pageFileOf(file)).toStrictEqual({
      page: 'pages/evidence.md',
      file,
      number,
      hasLeadingZero: true,
    })
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

  it('orders the numbers as numbers when they have leading zeros or more digits than a number can hold', () => {
    const files = [
      'pages/123456789012345678901-later.md',
      'pages/123456789012345678900-earlier.md',
      'pages/010-ten.md',
      'pages/9-nine.md',
    ].map(pageFileOf)

    expect(pageFilesInOrder(files).map((file) => file.file)).toStrictEqual([
      'pages/9-nine.md',
      'pages/010-ten.md',
      'pages/123456789012345678900-earlier.md',
      'pages/123456789012345678901-later.md',
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

describe('nextSubPageNumber', () => {
  const files = [
    'pages/index.md',
    'pages/1-first.md',
    'pages/2-second.md',
    'pages/2.1-wait.md',
    'pages/2.2-limit.md',
    'pages/2.2.1-deep.md',
    'pages/2.9-nine.md',
    'pages/notes.md',
  ].map(pageFileOf)

  it.each([
    [undefined, '3'],
    ['1', '1.1'],
    ['2', '2.10'],
    ['2.2', '2.2.2'],
    ['2.1', '2.1.1'],
  ])('gives the sub page of the page %s the number %s', (parent, number) => {
    expect(nextSubPageNumber(files, parent)).toBe(number)
  })

  it('gives the first sub page of the index page the number 1 when there is not any numbered page', () => {
    expect(nextSubPageNumber([pageFileOf('pages/index.md')], undefined)).toBe('1')
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

describe('storedPageIds', () => {
  const files = ['pages/index.md', 'pages/2026-plan.md', 'pages/1-2025-review.md'].map(pageFileOf)

  it('gives a stored page the id of its file when the stored page is a file path rather than an id', () => {
    expect(
      storedPageIds(['pages/2026-plan.md', 'pages/2026-plan.md', 'pages/index.md'], files),
    ).toStrictEqual([{ stored: 'pages/2026-plan.md', page: 'pages/plan.md' }])
  })

  it("leaves a stored page alone when it's an id or when there isn't any file with its path", () => {
    expect(
      storedPageIds(['pages/2025-review.md', 'pages/plan.md', 'pages/deleted.md'], files),
    ).toStrictEqual([])
  })
})
