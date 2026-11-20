import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
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
    'pages/retry.md',
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
    expect(checkPages(scratchPadWithRetryPage(), undefined, undefined)).toStrictEqual({
      text: [
        "pages/retry.md:3  the link points to pages/queue.md, which doesn't exist",
        '1 problem in 2 pages',
      ].join('\n'),
      problemCount: 1,
    })
  })

  it('checks only the requested page when a page is requested', () => {
    expect(checkPages(scratchPadWithRetryPage(), 'index', undefined)).toStrictEqual({
      text: "there aren't any problems in 1 page",
      problemCount: 0,
    })
  })

  it('passes the full path of each checked page to the prose check when a prose check is set', () => {
    const folder = scratchPadWithRetryPage()
    const result = checkPages(folder, 'index', (path) => [`${path} has a long sentence`])

    expect(result.text.split('\n')[0]).toBe(
      `pages/index.md  ${join(folder.path, 'pages/index.md')} has a long sentence`,
    )
  })

  it("throws UnknownPageError when the requested page doesn't exist", () => {
    const check = () => checkPages(scratchPadWithRetryPage(), 'invoice', undefined)

    expect(check).toThrow(UnknownPageError)
    expect(check).toThrow(
      "There isn't any page called invoice in 2026-03-14-export-job. The pages are: pages/index.md, pages/retry.md",
    )
  })
})
