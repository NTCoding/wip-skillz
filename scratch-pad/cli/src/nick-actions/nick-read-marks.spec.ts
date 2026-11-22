import { afterEach, describe, expect, it } from 'vitest'
import { UnknownPageError } from '../pages/page-markdown'
import { readMarksOf as shownReadMarks } from '../nick-views/nick-views'
import { sectionTexts, UnknownSectionError, type SectionHash } from '../read-marks/read-marks'
import { type ScratchPadFolder } from '../scratch-pad-folder/scratch-pad-folder'
import {
  exportJobScratchPad,
  freezeClockAt,
  removeTemporaryHomes,
  temporaryHome,
  writeFileInPad,
} from '../scratch-pad-folder/scratch-pad-folder-fixtures'
import { nickMarksPageRead, nickMarksPageUnread, nickMarksSectionRead } from './nick-actions'

const time = '2026-03-14T09:30:00.000Z'

freezeClockAt(time)

afterEach(() => {
  removeTemporaryHomes()
})

function readMarksOf(folder: ScratchPadFolder) {
  const marks = folder.read((pad) => pad.readReadMarks())
  return {
    pages: marks.pages,
    sections: marks.sections.map((mark) => `${mark.page}#${mark.section}`),
  }
}

// The hash of each section that the browser shows now
function shownSections(folder: ScratchPadFolder): SectionHash[] {
  return sectionTexts(folder.readPageLines('pages/index.md').join('\n')).map(({ id, hash }) => ({
    id,
    hash,
  }))
}

function changedSectionsOf(folder: ScratchPadFolder): string[] {
  return shownReadMarks(folder).pages.flatMap((page) =>
    page.changedSections.map((section) => section.id),
  )
}

const changedPage = '# Export job\n\n## Retry policy\n\nIt retries 6 times.\n'

function eventKindsOf(folder: ScratchPadFolder) {
  return folder.read((pad) => pad.readEvents().map((event) => [event.kind, event.by, event.item]))
}

describe('nickMarksPageRead', () => {
  it('marks the page and every section of the page as read and appends a page-read event by Nick', () => {
    const folder = exportJobScratchPad(temporaryHome())

    nickMarksPageRead(folder, 'index', shownSections(folder))

    expect(readMarksOf(folder)).toStrictEqual({
      pages: ['pages/index.md'],
      sections: ['pages/index.md#retry-policy'],
    })
    expect(eventKindsOf(folder)).toStrictEqual([['page-read', 'nick', undefined]])
  })

  it('marks a changed section as read again when Nick marks the page as read again', () => {
    const folder = exportJobScratchPad(temporaryHome())
    nickMarksPageRead(folder, 'index', shownSections(folder))
    const before = folder.read((pad) => pad.readReadMarks().sections[0]?.hash)
    writeFileInPad(
      folder,
      'pages/index.md',
      '# Export job\n\n## Retry policy\n\nIt retries 6 times.\n',
    )

    nickMarksPageRead(folder, 'index', shownSections(folder))

    expect(
      folder.read((pad) => pad.readReadMarks().sections.map((mark) => mark.hash)),
    ).not.toContain(before)
  })

  it('keeps the sections that the agent changed or added after the browser showed the page as changed', () => {
    const folder = exportJobScratchPad(temporaryHome())
    const shown = shownSections(folder)
    writeFileInPad(folder, 'pages/index.md', `${changedPage}\n## The logo\n\nA.\n`)

    nickMarksPageRead(folder, 'index', shown)

    expect(changedSectionsOf(folder)).toStrictEqual(['retry-policy', 'the-logo'])
  })

  it("doesn't store a shown section that isn't on the page any more", () => {
    const folder = exportJobScratchPad(temporaryHome())

    nickMarksPageRead(folder, 'index', [
      ...shownSections(folder),
      { id: 'the-logo', hash: 'a hash of the logo' },
    ])

    expect(readMarksOf(folder).sections).toStrictEqual(['pages/index.md#retry-policy'])
  })

  it("throws UnknownPageError when the page doesn't exist", () => {
    expect(() => nickMarksPageRead(exportJobScratchPad(temporaryHome()), 'logo', [])).toThrow(
      UnknownPageError,
    )
  })
})

describe('nickMarksPageUnread', () => {
  it('removes the marks of the page and of its sections and appends a page-unread event by Nick', () => {
    const folder = exportJobScratchPad(temporaryHome())
    nickMarksPageRead(folder, 'index', shownSections(folder))

    nickMarksPageUnread(folder, 'index.md')

    expect(readMarksOf(folder)).toStrictEqual({ pages: [], sections: [] })
    expect(eventKindsOf(folder)).toStrictEqual([
      ['page-read', 'nick', undefined],
      ['page-unread', 'nick', undefined],
    ])
  })
})

describe('nickMarksSectionRead', () => {
  it('stores the hash that the browser showed and appends a section-read event by Nick', () => {
    const folder = exportJobScratchPad(temporaryHome())
    nickMarksPageRead(folder, 'index', shownSections(folder))
    writeFileInPad(folder, 'pages/index.md', changedPage)
    const [shown] = shownSections(folder)

    nickMarksSectionRead(folder, 'index', shown ?? { id: 'retry-policy', hash: '' })

    expect(changedSectionsOf(folder)).toStrictEqual([])
    expect(eventKindsOf(folder).at(-1)).toStrictEqual(['section-read', 'nick', undefined])
  })

  it('keeps the section as changed when the agent changed it again after the browser showed it', () => {
    const folder = exportJobScratchPad(temporaryHome())
    nickMarksPageRead(folder, 'index', shownSections(folder))
    writeFileInPad(folder, 'pages/index.md', changedPage)
    const [shown] = shownSections(folder)
    writeFileInPad(folder, 'pages/index.md', changedPage.replace('6 times', '7 times'))

    nickMarksSectionRead(folder, 'index', shown ?? { id: 'retry-policy', hash: '' })

    expect(changedSectionsOf(folder)).toStrictEqual(['retry-policy'])
  })

  it("throws UnknownSectionError and saves nothing when the page doesn't have the section", () => {
    const folder = exportJobScratchPad(temporaryHome())

    expect(() =>
      nickMarksSectionRead(folder, 'index', { id: 'the-logo', hash: 'a hash of the logo' }),
    ).toThrow(UnknownSectionError)
    expect(eventKindsOf(folder)).toStrictEqual([])
  })
})
