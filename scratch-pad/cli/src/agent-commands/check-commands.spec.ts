import { mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { nickComments, nickResolves } from '../nick-actions/nick-actions'
import { UnknownPageError } from '../pages/page-markdown'
import {
  exportJobScratchPad,
  removeTemporaryHomes,
  temporaryHome,
  writeFileInPad,
} from '../scratch-pad-folder/scratch-pad-folder-fixtures'
import { checkPages } from './check-commands'

afterEach(() => {
  removeTemporaryHomes()
})

function scratchPadWithRetryPage() {
  const folder = exportJobScratchPad(temporaryHome())
  mkdirSync(join(folder.path, 'custom'))
  writeFileInPad(folder, 'custom/retry-steps.html', '<ol><li>retry</li></ol>')
  writeFileInPad(
    folder,
    'pages/1-retry.md',
    [
      '# Retry',
      '',
      'See [the policy](index.md#retry-policy) and [the queue](queue.md).',
      '',
      ':::html file=custom/retry-steps.html',
      ':::',
    ].join('\n'),
  )
  return folder
}

describe('checkPages', () => {
  it('prints the problems of every page and counts them when no page is requested', () => {
    expect(checkPages(scratchPadWithRetryPage(), [], undefined)).toStrictEqual({
      text: [
        "pages/1-retry.md:3  the link points to pages/queue.md, which doesn't exist",
        '1 problem in 2 pages',
      ].join('\n'),
      problemCount: 1,
    })
  })

  it('reports an open thread whose page the agent has deleted when no page is requested', () => {
    const folder = scratchPadWithRetryPage()
    const anchor = { firstLine: 1, lastLine: 1, selectedText: 'Retry', prefix: '', suffix: '' }
    nickComments(folder, { type: 'comment', page: 'retry', anchor, text: 'Is this page needed?' })
    nickComments(folder, { type: 'comment', page: 'retry', anchor, text: 'Fine.' })
    nickResolves(folder, 'c-2')
    rmSync(join(folder.path, 'pages/1-retry.md'))

    expect(checkPages(folder, [], undefined).text).toBe(
      [
        "pages/retry.md  c-1 is still open on a page that doesn't exist any more. Restore the page or reply to c-1 so that Nick can resolve it in his Inbox",
        '1 problem in 1 page',
      ].join('\n'),
    )
    expect(checkPages(folder, ['index'], undefined).problemCount).toBe(0)
  })

  it("reports the decision when there aren't any headings above the decision", () => {
    const folder = exportJobScratchPad(temporaryHome())
    writeFileInPad(
      folder,
      'pages/1-schedule.md',
      ':::decision d-7\nproposal: Export at night.\nalternative: Export every hour.\npick: proposal\n:::\n',
    )

    expect(checkPages(folder, ['schedule'], undefined)).toStrictEqual({
      text: [
        "pages/1-schedule.md:1  decision d-7 doesn't have a heading above it (write the question as a heading)",
        '1 problem in 1 page',
      ].join('\n'),
      problemCount: 1,
    })
  })

  it('checks only the requested page when a page is requested', () => {
    expect(checkPages(scratchPadWithRetryPage(), ['index'], undefined)).toStrictEqual({
      text: "there aren't any problems in 1 page",
      problemCount: 0,
    })
  })

  it('passes the full path of each checked page to the prose check when a prose check is set', () => {
    const folder = scratchPadWithRetryPage()
    const result = checkPages(folder, ['index'], (path) => [`${path} has a long sentence`])

    expect(result.text.split('\n')[0]).toBe(
      `pages/index.md  ${join(folder.path, 'pages/index.md')} has a long sentence`,
    )
  })

  it('passes the Markdown of each checked page to the prose check when a prose check is set', () => {
    const result = checkPages(scratchPadWithRetryPage(), ['retry'], (_path, text) => [
      `the page starts with ${text.split('\n')[0]}`,
    ])

    expect(result.text.split('\n')[1]).toBe('pages/1-retry.md  the page starts with # Retry')
  })

  it('checks every requested page once when several pages are requested', () => {
    expect(
      checkPages(scratchPadWithRetryPage(), ['index', 'retry.md', 'retry'], undefined),
    ).toStrictEqual({
      text: [
        "pages/1-retry.md:3  the link points to pages/queue.md, which doesn't exist",
        '1 problem in 2 pages',
      ].join('\n'),
      problemCount: 1,
    })
  })

  it('checks the requested page when another page reads a custom HTML file that is a folder', () => {
    const folder = scratchPadWithRetryPage()
    rmSync(join(folder.path, 'custom/retry-steps.html'))
    mkdirSync(join(folder.path, 'custom/retry-steps.html'))

    expect(checkPages(folder, ['index'], undefined)).toStrictEqual({
      text: "there aren't any problems in 1 page",
      problemCount: 0,
    })
  })

  it('reports the html block when the custom HTML file that the block reads is a folder', () => {
    const folder = scratchPadWithRetryPage()
    rmSync(join(folder.path, 'custom/retry-steps.html'))
    mkdirSync(join(folder.path, 'custom/retry-steps.html'))

    expect(checkPages(folder, ['retry'], undefined).text.split('\n')[1]).toBe(
      "pages/1-retry.md:5  the :::html block reads custom/retry-steps.html, which doesn't exist",
    )
  })

  it("doesn't read the custom HTML files of a page when that page isn't checked", () => {
    const folder = scratchPadWithRetryPage()
    const readCustomFile = vi.spyOn(folder, 'readCustomFile')
    checkPages(folder, ['index'], undefined)

    expect(readCustomFile).not.toHaveBeenCalled()
  })

  it('prints the problems of the numbers in the file names when no page is requested', () => {
    const folder = scratchPadWithRetryPage()
    writeFileInPad(folder, 'pages/notes.md', '# Notes\n')
    writeFileInPad(folder, 'pages/2-retry.md', '# Retry again\n')

    expect(checkPages(folder, [], undefined).text).toBe(
      [
        'pages/2-retry.md  the page has the same name as pages/1-retry.md after its number. Give one of the 2 pages another name',
        "pages/1-retry.md:3  the link points to pages/queue.md, which doesn't exist",
        "pages/notes.md  the page doesn't have a number. Rename the file to <number>-notes.md, where the number is the place of the page in the order",
        '3 problems in 3 pages',
      ].join('\n'),
    )
  })

  it("throws UnknownPageError when the requested page doesn't exist", () => {
    const check = () => checkPages(scratchPadWithRetryPage(), ['index', 'invoice'], undefined)

    expect(check).toThrow(UnknownPageError)
    expect(check).toThrow(
      "There isn't any page called invoice in 2026-03-14-export-job. The pages are: pages/index.md, pages/retry.md",
    )
  })
})
