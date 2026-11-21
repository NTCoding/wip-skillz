import { mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { exportedPadData } from '../browser-page/api-responses'
import {
  exportJobScratchPad,
  removeTemporaryHomes,
  temporaryHome,
  writeFileInPad,
} from '../scratch-pad-folder/scratch-pad-folder-fixtures'
import { type ScratchPadFolder } from '../scratch-pad-folder/scratch-pad-folder'
import { commentAndGrammarNoteAndDecision } from './agent-commands-fixtures'
import { ExportNotWrittenError, exportScratchPad } from './export-commands'

const bundle = { script: 'startBrowserPage()', stylesheet: '.page{color:var(--text)}' }

afterEach(() => {
  removeTemporaryHomes()
})

function exportedData(html: string): unknown {
  const json = /<script type="application\/json" id="scratch-pad-export">(.*?)<\/script>/su.exec(
    html,
  )?.[1]
  return JSON.parse(json ?? 'null')
}

function scratchPadWithTwoPages(): ScratchPadFolder {
  const folder = exportJobScratchPad(temporaryHome())
  writeFileInPad(
    folder,
    'pages/retry-policy.md',
    '# Retry policy\n\nEach retry waits 30 seconds.\n',
  )
  commentAndGrammarNoteAndDecision(folder)
  return folder
}

describe('exportScratchPad', () => {
  it('writes export.html in the scratch pad and prints the counts when --out isn’t given', () => {
    const folder = scratchPadWithTwoPages()
    const path = join(folder.path, 'export.html')

    expect(exportScratchPad(folder, { out: undefined, bundle })).toBe(
      `exported 2 pages and 2 threads to ${path}`,
    )
    expect(readFileSync(path, 'utf8')).toContain('<title>Export job</title>')
  })

  it('writes every page, thread, task and logged decision in the data that the browser page reads when the scratch pad is exported', () => {
    const folder = scratchPadWithTwoPages()
    exportScratchPad(folder, { out: undefined, bundle })
    const data = exportedPadData.parse(
      exportedData(readFileSync(join(folder.path, 'export.html'), 'utf8')),
    )

    expect(data.viewedPages.map((page) => page.title)).toStrictEqual(['Export job', 'Retry policy'])
    expect(data.threads.map((thread) => thread.id)).toStrictEqual(['c-1', 'g-1'])
    expect(data.progressTracker.title).toBe('Export job')
    expect(data.decisionLog.map((entry) => entry.source)).toStrictEqual(['page'])
  })

  it('writes the improvements in the data that the browser page reads when the scratch pad is exported', () => {
    const folder = scratchPadWithTwoPages()
    exportScratchPad(folder, { out: undefined, bundle })
    const data = exportedPadData.parse(
      exportedData(readFileSync(join(folder.path, 'export.html'), 'utf8')),
    )

    expect(data.improvements.notes.map((note) => note.id)).toStrictEqual(['g-1'])
  })

  it('writes the file that --out names and creates its folder when the folder doesn’t exist', () => {
    const folder = scratchPadWithTwoPages()
    const path = join(temporaryHome(), 'shared', 'retry-policy.html')

    expect(exportScratchPad(folder, { out: path, bundle })).toBe(
      `exported 2 pages and 2 threads to ${path}`,
    )
    expect(readFileSync(path, 'utf8')).toContain(
      '<script type="module">startBrowserPage()</script>',
    )
  })

  it('throws ExportNotWrittenError when --out names a folder', () => {
    const folder = scratchPadWithTwoPages()
    const path = join(temporaryHome(), 'shared')
    mkdirSync(path)

    expect(() => exportScratchPad(folder, { out: path, bundle })).toThrow(ExportNotWrittenError)
    expect(() => exportScratchPad(folder, { out: path, bundle })).toThrow(
      `The export can't be written to ${path} (Error: EISDIR: illegal operation on a directory, open '${path}'). Pick another file with --out <file>.`,
    )
  })
})
