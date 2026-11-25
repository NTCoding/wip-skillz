import { afterEach, describe, expect, it } from 'vitest'
import {
  exportJobScratchPad,
  removeTemporaryHomes,
  temporaryHome,
} from './scratch-pad-folder-fixtures'
import { PageFileExistsError } from './scratch-pad-folder'

afterEach(() => {
  removeTemporaryHomes()
})

describe('ScratchPadFolder.writeNewPage', () => {
  it('writes the file of a new page in the folder of the pages', () => {
    const folder = exportJobScratchPad(temporaryHome())

    folder.writeNewPage('pages/1-idea.md', '# Idea\n')

    expect(folder.readPageLines('pages/idea.md')).toStrictEqual(['# Idea', ''])
  })

  it('throws PageFileExistsError and doesn’t change the text of a file that exists', () => {
    const folder = exportJobScratchPad(temporaryHome())
    folder.writeNewPage('pages/1-idea.md', '# Idea\n')

    expect(() => folder.writeNewPage('pages/1-idea.md', '# Other\n')).toThrow(PageFileExistsError)
    expect(folder.readPageLines('pages/idea.md')).toStrictEqual(['# Idea', ''])
  })
})
