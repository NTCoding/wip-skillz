import { afterEach, describe, expect, it } from 'vitest'
import { nickComments } from '../nick-actions/nick-actions'
import { readMarksOf } from '../nick-views/nick-views'
import { UnknownSectionError } from '../read-marks/read-marks'
import {
  exportJobPadName,
  exportJobScratchPad,
  freezeClockAt,
  removeTemporaryHomes,
  temporaryHome,
  writeFileInPad,
} from '../scratch-pad-folder/scratch-pad-folder-fixtures'
import { type ScratchPadFolder } from '../scratch-pad-folder/scratch-pad-folder'
import { retryAnchor } from '../threads/thread-fixtures'
import { InvalidRequestBodyError } from './request-body'
import { respondToApiRequest, type ApiResponse } from './scratch-pad-api'

const time = '2026-03-14T09:30:00.000Z'
const padApi = `/api/scratch-pads/${exportJobPadName}`
const changedIndex = '# Export job\n\n## Retry policy\n\nIt retries 6 times.\n'

freezeClockAt(time)

afterEach(() => {
  removeTemporaryHomes()
})

function request(home: string, method: 'GET' | 'POST', path: string, body = '{}'): ApiResponse {
  return respondToApiRequest({ home, method, path: `${padApi}${path}`, body })
}

// The body that the browser posts when Nick marks the index page as read
function shownPageBody(folder: ScratchPadFolder): string {
  return JSON.stringify({ sections: readMarksOf(folder).pages[0]?.sections })
}

function readMarksWith(state: string, changedSections: unknown[] = []) {
  return { kind: 'json', body: { pages: [{ page: 'pages/index.md', state, changedSections }] } }
}

describe('respondToApiRequest for the read marks', () => {
  it('returns every page as new before Nick has read anything', () => {
    const home = temporaryHome()
    exportJobScratchPad(home)

    expect(request(home, 'GET', '/read-marks')).toMatchObject(readMarksWith('new'))
  })

  it('returns the page after Nick marks the page as read and then as unread', () => {
    const home = temporaryHome()
    const folder = exportJobScratchPad(home)

    expect(request(home, 'POST', '/pages/index.md/read', shownPageBody(folder))).toMatchObject({
      kind: 'json',
      body: { page: 'index.md' },
    })
    expect(request(home, 'GET', '/read-marks')).toMatchObject(readMarksWith('read'))
    expect(request(home, 'POST', '/pages/index.md/unread')).toMatchObject({
      kind: 'json',
      body: { page: 'index.md' },
    })
    expect(request(home, 'GET', '/read-marks')).toMatchObject(readMarksWith('new'))
  })

  it('keeps a section as changed when the agent saved it after the browser showed it', () => {
    const home = temporaryHome()
    const folder = exportJobScratchPad(home)
    const shown = shownPageBody(folder)
    writeFileInPad(folder, 'pages/index.md', changedIndex)

    request(home, 'POST', '/pages/index.md/read', shown)

    expect(request(home, 'GET', '/read-marks')).toMatchObject(
      readMarksWith('read', [{ id: 'retry-policy', title: 'Retry policy' }]),
    )
  })

  it('marks the section as read with the hash that the browser showed', () => {
    const home = temporaryHome()
    const folder = exportJobScratchPad(home)
    request(home, 'POST', '/pages/index.md/read', shownPageBody(folder))
    writeFileInPad(folder, 'pages/index.md', changedIndex)
    const hash = readMarksOf(folder).pages[0]?.changedSections[0]?.hash

    expect(
      request(home, 'POST', '/pages/index.md/sections/retry-policy/read', JSON.stringify({ hash })),
    ).toMatchObject({ kind: 'json', body: { page: 'index.md' } })
    expect(request(home, 'GET', '/read-marks')).toMatchObject(readMarksWith('read'))
  })

  it("throws UnknownSectionError when the section isn't on the page", () => {
    const home = temporaryHome()
    exportJobScratchPad(home)

    expect(() =>
      request(home, 'POST', '/pages/index.md/sections/the-logo/read', '{"hash":"a"}'),
    ).toThrow(UnknownSectionError)
  })

  it('throws InvalidRequestBodyError when the sections of the page are missing or invalid', () => {
    const home = temporaryHome()
    exportJobScratchPad(home)

    expect(() => request(home, 'POST', '/pages/index.md/read')).toThrow(InvalidRequestBodyError)
    expect(() =>
      request(home, 'POST', '/pages/index.md/read', '{"sections":[{"id":"retry-policy"}]}'),
    ).toThrow(InvalidRequestBodyError)
    expect(() => request(home, 'POST', '/pages/index.md/read', '{"sections":[5]}')).toThrow(
      InvalidRequestBodyError,
    )
  })
})

describe('respondToApiRequest for every thread of the scratch pad', () => {
  it('returns each thread with the time it was resolved', () => {
    const home = temporaryHome()
    nickComments(exportJobScratchPad(home), {
      type: 'comment',
      page: 'index',
      anchor: retryAnchor,
      text: 'Why 5?',
    })

    expect(request(home, 'GET', '/threads')).toMatchObject({
      kind: 'json',
      body: { threads: [{ id: 'c-1', resolvedTime: undefined }] },
    })
  })
})
