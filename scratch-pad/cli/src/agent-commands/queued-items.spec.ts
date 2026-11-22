import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { servedLinks } from '../item-links/item-links-fixtures'
import {
  nickComments,
  nickEditsQueuedItem,
  nickQueuesComment,
  nickQueuesReply,
  nickRemovesQueuedItem,
  nickSendsOutbox,
} from '../nick-actions/nick-actions'
import { threadsOfPage } from '../nick-views/nick-views'
import { type ScratchPadFolder } from '../scratch-pad-folder/scratch-pad-folder'
import {
  exportJobScratchPad,
  removeTemporaryHomes,
  temporaryHome,
} from '../scratch-pad-folder/scratch-pad-folder-fixtures'
import { retryAnchor } from '../threads/thread-fixtures'
import { exportScratchPad } from './export-commands'
import { readAgentInbox, scratchPadStatus } from './inbox-commands'
import { listPages } from './page-commands'
import { replyToThread, showItem } from './thread-commands'
import { waitForAgentInbox, type WaitRequest } from './wait-commands'

afterEach(() => {
  removeTemporaryHomes()
})

const allTypes = ['comment', 'decision', 'grammar', 'improvement'] as const

function waitRequest(changes: Partial<WaitRequest> = {}): WaitRequest {
  return {
    types: ['comment', 'decision'],
    quietMilliseconds: 0,
    timeoutMilliseconds: undefined,
    checkMilliseconds: 10,
    stopSignal: new AbortController().signal,
    links: () => Promise.resolve(servedLinks),
    ...changes,
  }
}

function queueRetryComment(folder: ScratchPadFolder, text = 'Is 30 seconds long enough?'): void {
  nickQueuesComment(folder, { type: 'comment', page: 'index', anchor: retryAnchor, text })
}

// c-1 has been sent and the agent has replied to it. Nick has then queued a new comment and a
// reply to c-1 in the outbox.
function padWithQueuedCommentAndReply(): ScratchPadFolder {
  const folder = exportJobScratchPad(temporaryHome())
  nickComments(folder, { type: 'comment', page: 'index', anchor: retryAnchor, text: 'Why 5?' })
  readAgentInbox(folder, { types: allTypes, includeSeen: false }, servedLinks)
  replyToThread(folder, 'c-1', 'The shops asked for 5.', servedLinks)
  queueRetryComment(folder)
  nickQueuesReply(folder, 'c-1', 'Can a shop ask for 8?')
  return folder
}

describe('the agent and the items in the outbox', () => {
  it('prints nothing new in the inbox while the items are in the outbox, even with --all', () => {
    const folder = padWithQueuedCommentAndReply()

    expect(readAgentInbox(folder, { types: allTypes, includeSeen: false }, servedLinks)).toBe(
      'nothing new in 2026-03-14-export-job',
    )
    expect(readAgentInbox(folder, { types: allTypes, includeSeen: true }, servedLinks)).toBe(
      'nothing waits for the agent in 2026-03-14-export-job',
    )
  })

  it('doesn’t count the queued items in the status', () => {
    expect(scratchPadStatus(padWithQueuedCommentAndReply(), servedLinks)).toContain(
      'waiting for the agent: nothing',
    )
  })

  it('doesn’t show the queued reply in the thread', () => {
    expect(showItem(padWithQueuedCommentAndReply(), 'c-1', servedLinks)).not.toContain(
      'Can a shop ask for 8?',
    )
  })

  it('doesn’t count the queued comment as an open thread in the list of pages or in the threads of the page', () => {
    const folder = padWithQueuedCommentAndReply()

    expect(listPages(folder, servedLinks)).toContain('1 open thread')
    expect(threadsOfPage(folder, 'index').map((thread) => thread.id)).toStrictEqual(['c-1'])
  })

  it('doesn’t write the queued items in the export', () => {
    const folder = padWithQueuedCommentAndReply()
    exportScratchPad(folder, { out: undefined, bundle: { script: '', stylesheet: '' } })
    const html = readFileSync(join(folder.path, 'export.html'), 'utf8')

    expect([
      html.includes('Is 30 seconds long enough?'),
      html.includes('Can a shop ask for 8?'),
    ]).toStrictEqual([false, false])
  })

  it('prints both items as new items in the inbox once Nick sends the outbox', () => {
    const folder = padWithQueuedCommentAndReply()
    nickSendsOutbox(folder)

    const printed = readAgentInbox(folder, { types: allTypes, includeSeen: false }, servedLinks)

    expect(printed).toMatch(/^2 new items in 2026-03-14-export-job/)
    expect([printed.includes('[c-1]'), printed.includes('[c-2]')]).toStrictEqual([true, true])
    expect(printed).toContain('Nick: Can a shop ask for 8?')
    expect(printed).toContain('Nick: Is 30 seconds long enough?')
  })

  it('doesn’t end the wait when Nick queues, edits and removes items in the outbox', async () => {
    const folder = exportJobScratchPad(temporaryHome())
    setTimeout(() => {
      queueRetryComment(folder)
      queueRetryComment(folder, 'Is 8 retries enough?')
      nickEditsQueuedItem(folder, 1, 'Is 40 seconds long enough?')
      nickRemovesQueuedItem(folder, 2)
    }, 20)

    await expect(
      waitForAgentInbox(folder, waitRequest({ timeoutMilliseconds: 200 })),
    ).resolves.toBe('the wait ended before a new item arrived in 2026-03-14-export-job')
  })

  it('ends the wait with the queued comment as a new item once Nick sends the outbox', async () => {
    const folder = exportJobScratchPad(temporaryHome())
    queueRetryComment(folder)
    setTimeout(() => nickSendsOutbox(folder), 50)

    await expect(waitForAgentInbox(folder, waitRequest())).resolves.toMatch(
      /^1 new item in 2026-03-14-export-job\n\n\[c-1\] comment[^]*Nick: Is 30 seconds long enough\?/,
    )
  })

  it('doesn’t make the wait for a sent comment longer when Nick queues an item during the quiet time', async () => {
    const folder = exportJobScratchPad(temporaryHome())
    const sentAt = Date.now()
    nickComments(folder, { type: 'comment', page: 'index', anchor: retryAnchor, text: 'Why 5?' })
    setTimeout(() => queueRetryComment(folder), 150)

    await waitForAgentInbox(folder, waitRequest({ quietMilliseconds: 300 }))

    expect(Date.now() - sentAt).toBeLessThan(450)
  })
})
