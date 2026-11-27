import { afterEach, describe, expect, it } from 'vitest'
import { nickComments } from '../nick-actions/nick-actions'
import { exportJobAddress, servedLinks } from '../item-links/item-links-fixtures'
import {
  exportJobScratchPad,
  removeTemporaryHomes,
  temporaryHome,
} from '../scratch-pad-folder/scratch-pad-folder-fixtures'
import { type ScratchPadFolder } from '../scratch-pad-folder/scratch-pad-folder'
import { retryAnchor } from '../threads/thread-fixtures'
import { threadOnAssignedSubtask } from './agent-commands-fixtures'
import { readAgentInbox } from './inbox-commands'
import { followAgentInbox, waitForAgentInbox, type WaitRequest } from './wait-commands'

const commentText = [
  '1 new item in 2026-03-14-export-job',
  '',
  '[c-1] comment · pages/index.md:5-6 · section "Retry policy"',
  `  link: ${exportJobAddress}#c-1`,
  '  selected: "The export job retries 5 times."',
  '  Nick: Is 5 retries enough on a slow network?',
].join('\n')

const endedText = 'the wait ended before a new item arrived in 2026-03-14-export-job'

afterEach(() => {
  removeTemporaryHomes()
})

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

function nickCommentsOnRetryPolicy(folder: ScratchPadFolder): void {
  nickComments(folder, {
    type: 'comment',
    page: 'pages/index.md',
    anchor: retryAnchor,
    text: 'Is 5 retries enough on a slow network?',
  })
}

function nickWritesNewComment(folder: ScratchPadFolder): void {
  nickComments(folder, {
    type: 'comment',
    page: 'pages/index.md',
    anchor: retryAnchor,
    text: 'What about a longer wait?',
  })
}

function nickWritesGrammarNote(folder: ScratchPadFolder): void {
  nickComments(folder, {
    type: 'grammar',
    page: 'pages/index.md',
    anchor: {
      firstLine: 5,
      lastLine: 6,
      selectedText: 'Each retry waits',
      prefix: 'The export job retries 5 times.',
      suffix: '30 seconds.',
    },
    text: 'Write "waits for" here.',
  })
}

describe('waitForAgentInbox', () => {
  it('prints the comment as the inbox does when Nick writes the comment while the agent waits', async () => {
    const folder = exportJobScratchPad(temporaryHome())
    setTimeout(() => nickCommentsOnRetryPolicy(folder), 50)

    await expect(waitForAgentInbox(folder, waitRequest())).resolves.toBe(commentText)
  })

  it('prints the message that Nick writes in the thread of a subtask while the agent waits', async () => {
    const folder = exportJobScratchPad(temporaryHome())
    setTimeout(() => threadOnAssignedSubtask(folder), 50)

    await expect(waitForAgentInbox(folder, waitRequest())).resolves.toBe(
      [
        '1 new item in 2026-03-14-export-job',
        '',
        '[c-1] comment · subtask 2.2: Log each retry',
        `  link: ${exportJobAddress}progress-tracker#c-1`,
        '  Nick: Which log should I check?',
      ].join('\n'),
    )
  })

  it('prints the comment at once when the comment waited before the wait started', async () => {
    const folder = exportJobScratchPad(temporaryHome())
    nickCommentsOnRetryPolicy(folder)

    await expect(waitForAgentInbox(folder, waitRequest())).resolves.toBe(commentText)
  })

  it('records the printed comment so that the inbox prints nothing new afterwards', async () => {
    const folder = exportJobScratchPad(temporaryHome())
    nickCommentsOnRetryPolicy(folder)
    await waitForAgentInbox(folder, waitRequest())

    expect(readAgentInbox(folder, { types: ['comment'], includeSeen: false }, servedLinks)).toBe(
      'nothing new in 2026-03-14-export-job · 1 item printed before (scratch-pad inbox --pad 2026-03-14-export-job --all)',
    )
  })

  it('prints only after Nick has been quiet for the quiet time when Nick wrote a comment just now', async () => {
    const folder = exportJobScratchPad(temporaryHome())
    const commentTime = Date.now()
    nickCommentsOnRetryPolicy(folder)

    await waitForAgentInbox(folder, waitRequest({ quietMilliseconds: 300 }))

    expect(Date.now() - commentTime).toBeGreaterThanOrEqual(300)
  })

  it('prints the comment at the timeout when Nick wrote the comment during the quiet time', async () => {
    const folder = exportJobScratchPad(temporaryHome())
    setTimeout(() => nickCommentsOnRetryPolicy(folder), 20)

    await expect(
      waitForAgentInbox(folder, waitRequest({ quietMilliseconds: 5000, timeoutMilliseconds: 150 })),
    ).resolves.toBe(commentText)
  })

  it('ends without printing a grammar note when only comments and decisions are waited for', async () => {
    const folder = exportJobScratchPad(temporaryHome())
    setTimeout(() => nickWritesGrammarNote(folder), 20)

    await expect(
      waitForAgentInbox(folder, waitRequest({ timeoutMilliseconds: 150 })),
    ).resolves.toBe(endedText)
  })

  it('prints the grammar note when the wait is for grammar notes', async () => {
    const folder = exportJobScratchPad(temporaryHome())
    setTimeout(() => nickWritesGrammarNote(folder), 20)

    await expect(waitForAgentInbox(folder, waitRequest({ types: ['grammar'] }))).resolves.toMatch(
      /^1 new item in 2026-03-14-export-job\n\n\[g-1\] grammar note/,
    )
  })

  it('ends without printing when the stop signal is aborted', async () => {
    const folder = exportJobScratchPad(temporaryHome())
    const stopping = new AbortController()
    setTimeout(() => stopping.abort(), 30)

    await expect(
      waitForAgentInbox(folder, waitRequest({ stopSignal: stopping.signal })),
    ).resolves.toBe(endedText)
  })
})

describe('followAgentInbox', () => {
  it('prints each batch of comments when Nick writes a comment after the batch before', async () => {
    const folder = exportJobScratchPad(temporaryHome())
    const stopping = new AbortController()
    const batches: string[] = []
    setTimeout(() => nickCommentsOnRetryPolicy(folder), 20)
    setTimeout(() => nickWritesNewComment(folder), 200)
    setTimeout(() => stopping.abort(), 500)

    await followAgentInbox(folder, waitRequest({ stopSignal: stopping.signal }), (text) =>
      batches.push(text),
    )

    expect(batches).toHaveLength(2)
    expect(batches[0]).toBe(commentText)
    expect(batches[1]).toMatch(/^1 new item in 2026-03-14-export-job\n\n\[c-2\] comment/)
  })

  it('prints nothing when the stop signal is aborted before a comment arrives', async () => {
    const folder = exportJobScratchPad(temporaryHome())
    const stopping = new AbortController()
    const batches: string[] = []
    setTimeout(() => stopping.abort(), 30)

    await followAgentInbox(folder, waitRequest({ stopSignal: stopping.signal }), (text) =>
      batches.push(text),
    )

    expect(batches).toStrictEqual([])
  })

  it('ends after the batch that is printed when the stop signal is aborted during the batch', async () => {
    const folder = exportJobScratchPad(temporaryHome())
    const stopping = new AbortController()
    const batches: string[] = []
    nickCommentsOnRetryPolicy(folder)

    await followAgentInbox(folder, waitRequest({ stopSignal: stopping.signal }), (text) => {
      batches.push(text)
      stopping.abort()
    })

    expect(batches).toStrictEqual([commentText])
  })
})
