import { rmSync, symlinkSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { readAgentInbox } from '../agent-commands/inbox-commands'
import { addTaskToTracker } from '../agent-commands/progress-tracker-commands'
import { nickComments } from '../nick-actions/nick-actions'
import {
  exportJobPadName,
  exportJobScratchPad,
  removeTemporaryHomes,
  temporaryHome,
  writeFileInPad,
} from '../scratch-pad-folder/scratch-pad-folder-fixtures'
import { type ScratchPadFolder } from '../scratch-pad-folder/scratch-pad-folder'
import { retryAnchor } from '../threads/thread-fixtures'
import { openChanges, startedServer } from './local-server-fixtures'

const changesPath = `/api/scratch-pads/${exportJobPadName}/changes`
const indexChange = { kind: 'page', page: 'pages/index.md' }

afterEach(() => {
  removeTemporaryHomes()
})

function agentEditsIndexPage(folder: ScratchPadFolder): void {
  writeFileInPad(folder, 'pages/index.md', '# Export job\n\nThe export job retries 8 times.\n')
}

async function serverWithExportJob(log: (text: string) => void = () => undefined) {
  const home = temporaryHome()
  const folder = exportJobScratchPad(home)
  return { folder, server: await startedServer(home, log) }
}

describe('PadChangeStreams', () => {
  it('sends a page change when the agent edits a page file', async () => {
    const { folder, server } = await serverWithExportJob()
    const changes = await openChanges(server, changesPath)

    agentEditsIndexPage(folder)

    await expect(changes.nextChange()).resolves.toStrictEqual(indexChange)
  })

  it('sends a thread change when Nick comments through another connection to pad.db', async () => {
    const { folder, server } = await serverWithExportJob()
    const changes = await openChanges(server, changesPath)

    nickComments(folder, { type: 'comment', page: 'index', anchor: retryAnchor, text: 'Why 5?' })

    await expect(changes.nextChange()).resolves.toStrictEqual({ kind: 'thread', id: 'c-1' })
  })

  it('sends the change to every browser when 2 browsers show the same scratch pad', async () => {
    const { folder, server } = await serverWithExportJob()
    const first = await openChanges(server, changesPath)
    const second = await openChanges(server, changesPath)

    addTaskToTracker(folder, 'Export the invoices')

    await expect(Promise.all([first.nextChange(), second.nextChange()])).resolves.toStrictEqual([
      { kind: 'progress-tracker' },
      { kind: 'progress-tracker' },
    ])
  })

  it('keeps sending changes to the other browser when one browser closes the stream', async () => {
    const { folder, server } = await serverWithExportJob()
    const first = await openChanges(server, changesPath)
    const second = await openChanges(server, changesPath)

    first.close()
    agentEditsIndexPage(folder)

    await expect(second.nextChange()).resolves.toStrictEqual(indexChange)
  })

  it('watches the scratch pad again when a browser opens the stream after the last one closed', async () => {
    const { folder, server } = await serverWithExportJob()
    const first = await openChanges(server, changesPath)
    first.close()
    await vi.waitFor(() => expect(first.receivedChanges()).toStrictEqual([]))
    const second = await openChanges(server, changesPath)

    agentEditsIndexPage(folder)

    await expect(second.nextChange()).resolves.toStrictEqual(indexChange)
  })

  it('sends nothing for pad.db when the agent reads the inbox without a new event', async () => {
    const { folder, server } = await serverWithExportJob()
    const changes = await openChanges(server, changesPath)

    readAgentInbox(folder, { types: ['comment'], includeSeen: false })
    await new Promise((resolve) => setTimeout(resolve, 50))
    agentEditsIndexPage(folder)

    await expect(changes.nextChange()).resolves.toStrictEqual(indexChange)
  })

  it('logs the problem and keeps checking when a page file cannot be read', async () => {
    const log = vi.fn<(text: string) => void>()
    const { folder, server } = await serverWithExportJob(log)
    const changes = await openChanges(server, changesPath)

    symlinkSync(join(folder.path, 'missing.md'), join(folder.path, 'pages', 'queue.md'))
    await vi.waitFor(() =>
      expect(log).toHaveBeenCalledWith(
        expect.stringMatching(
          /^The changes of 2026-03-14-export-job couldn't be checked: Error: ENOENT/,
        ),
      ),
    )
    rmSync(join(folder.path, 'pages', 'queue.md'))
    agentEditsIndexPage(folder)

    await expect(changes.nextChange()).resolves.toStrictEqual(indexChange)
  })
})
