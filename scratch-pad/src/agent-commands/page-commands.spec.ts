import { afterEach, describe, expect, it } from 'vitest'
import { nickComments, nickResolves } from '../nick-actions/nick-actions'
import { UnknownPageError } from '../pages/page-markdown'
import {
  exportJobScratchPad,
  removeTemporaryHomes,
  temporaryHome,
  writeFileInPad,
} from '../scratch-pad-folder/scratch-pad-folder-fixtures'
import { listPages, outlinePage } from './page-commands'

afterEach(() => {
  removeTemporaryHomes()
})

describe('listPages', () => {
  it('lists each page with its title and the number of threads that are still open', () => {
    const folder = exportJobScratchPad(temporaryHome())
    writeFileInPad(folder, 'pages/retry-policy.md', '# Retry policy\n')
    const note = { type: 'improvement' as const, anchor: undefined, text: 'Add an example.' }
    nickComments(folder, { ...note, page: 'pages/index.md' })
    nickComments(folder, { ...note, page: 'pages/index.md' })
    nickComments(folder, { ...note, page: 'pages/retry-policy.md' })
    nickResolves(folder, 'i-3')

    expect(listPages(folder)).toBe(
      [
        'pages/index.md         Export job    2 open threads',
        'pages/retry-policy.md  Retry policy  no open threads',
      ].join('\n'),
    )
  })
})

describe('outlinePage', () => {
  it('prints the headings of the page with their line numbers', () => {
    const folder = exportJobScratchPad(temporaryHome())

    expect(outlinePage(folder, 'index.md')).toBe('1  # Export job\n3  ## Retry policy')
  })

  it('throws UnknownPageError when the page does not exist', () => {
    const outline = () => outlinePage(exportJobScratchPad(temporaryHome()), 'invoice')

    expect(outline).toThrow(UnknownPageError)
    expect(outline).toThrow(
      "There isn't any page called invoice in 2026-03-14-export-job. The pages are: pages/index.md",
    )
  })
})
