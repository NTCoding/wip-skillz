import { createHash } from 'node:crypto'
import { utimesSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  nickComments,
  nickMarksPageRead,
  nickMarksPageUnread,
  nickResolves,
} from '../nick-actions/nick-actions'
import {
  exportJobScratchPad,
  freezeClockAt,
  removeTemporaryHomes,
  temporaryHome,
  writeFileInPad,
} from '../scratch-pad-folder/scratch-pad-folder-fixtures'
import { type ScratchPadFolder } from '../scratch-pad-folder/scratch-pad-folder'
import { retryAnchor } from '../threads/thread-fixtures'
import { readMarksOf, threadsOfPad } from './nick-views'

const time = '2026-03-14T09:30:00.000Z'
const writtenTime = '2026-03-14T09:20:00.000Z'

freezeClockAt(time)

afterEach(() => {
  removeTemporaryHomes()
})

function hashOf(text: string): string {
  return createHash('sha256').update(text).digest('hex')
}

function writePage(folder: ScratchPadFolder, file: string, text: string): void {
  writeFileInPad(folder, file, text)
  utimesSync(join(folder.path, file), new Date(writtenTime), new Date(writtenTime))
}

describe('readMarksOf', () => {
  it('returns every page as new, with the time its file was written, before Nick marks anything', () => {
    const folder = exportJobScratchPad(temporaryHome())
    writePage(folder, 'pages/index.md', '# Export job\n\n## Retry policy\n\nIt retries 5 times.\n')
    writePage(folder, 'pages/1.1-slow-networks.md', '# Slow networks\n\n## The limit\n\n8.\n')

    expect(readMarksOf(folder)).toStrictEqual({
      pages: [
        {
          page: 'pages/index.md',
          state: 'new',
          changedTime: writtenTime,
          sections: [
            { id: 'retry-policy', hash: hashOf('## Retry policy\n\nIt retries 5 times.') },
          ],
          changedSections: [],
        },
        {
          page: 'pages/slow-networks.md',
          state: 'new',
          changedTime: writtenTime,
          sections: [{ id: 'the-limit', hash: hashOf('## The limit\n\n8.') }],
          changedSections: [],
        },
      ],
    })
  })

  it('returns a read page with the sections that have changed since Nick marked the page as read', () => {
    const folder = exportJobScratchPad(temporaryHome())
    nickMarksPageRead(folder, 'index', readMarksOf(folder).pages[0]?.sections ?? [])
    writePage(
      folder,
      'pages/index.md',
      '# Export job\n\n## Retry policy\n\nIt retries 6 times.\n\n## The logo\n\nA.\n',
    )

    const retryPolicy = hashOf('## Retry policy\n\nIt retries 6 times.')
    const theLogo = hashOf('## The logo\n\nA.')
    expect(readMarksOf(folder).pages).toStrictEqual([
      {
        page: 'pages/index.md',
        state: 'read',
        changedTime: writtenTime,
        sections: [
          { id: 'retry-policy', hash: retryPolicy },
          { id: 'the-logo', hash: theLogo },
        ],
        changedSections: [
          { id: 'retry-policy', title: 'Retry policy', hash: retryPolicy },
          { id: 'the-logo', title: 'The logo', hash: theLogo },
        ],
      },
    ])
  })

  it('returns the page as new again after Nick marks the page as unread', () => {
    const folder = exportJobScratchPad(temporaryHome())
    nickMarksPageRead(folder, 'index', readMarksOf(folder).pages[0]?.sections ?? [])
    nickMarksPageUnread(folder, 'index')

    expect(readMarksOf(folder).pages.map((page) => page.state)).toStrictEqual(['new'])
  })
})

describe('threadsOfPad', () => {
  it('returns every thread with its position and the time Nick resolved it', () => {
    const folder = exportJobScratchPad(temporaryHome())
    writePage(folder, 'pages/1-logo.md', '# Logo\n\nThe logo is blue.\n')
    nickComments(folder, { type: 'comment', page: 'index', anchor: retryAnchor, text: 'Why 5?' })
    nickComments(folder, {
      type: 'comment',
      page: 'logo',
      anchor: {
        firstLine: 3,
        lastLine: 3,
        selectedText: 'blue',
        prefix: 'The logo is ',
        suffix: '.',
      },
      text: 'Why blue?',
    })
    nickResolves(folder, 'c-1')

    expect(
      threadsOfPad(folder).map((thread) => [
        thread.id,
        thread.page,
        thread.position?.kind,
        thread.resolvedTime,
      ]),
    ).toStrictEqual([
      ['c-1', 'pages/index.md', 'attached', time],
      ['c-2', 'pages/logo.md', 'attached', undefined],
    ])
  })
})
