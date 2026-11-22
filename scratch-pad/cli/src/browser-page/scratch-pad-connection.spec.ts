import { describe, expect, it, vi } from 'vitest'
import {
  decisionLog,
  exportPad,
  improvements,
  pageSummaries,
  progressTracker,
  retryQuestion,
} from './browser-page-fixtures'
import { queuedComment, queuedReply } from './outbox-fixtures'
import {
  ScratchPadRequestError,
  ServerUnreachableError,
  scratchPadConnection,
  type BrowserNetwork,
} from './scratch-pad-connection'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status })
}

function networkReturning(response: Response): BrowserNetwork & {
  readonly fetched: string[]
} {
  const fetched: string[] = []
  return {
    fetched,
    fetch: (url) => {
      fetched.push(url)
      return Promise.resolve(response)
    },
    openChangeStream: () => ({ addEventListener: () => undefined, close: () => undefined }),
  }
}

const api = `/api/scratch-pads/${exportPad}`

describe('scratchPadConnection', () => {
  it('reads the pages with null turned into undefined when the server returns them', async () => {
    const network = networkReturning(
      jsonResponse({
        pages: pageSummaries.map((page) => ({
          ...page,
          number: page.number ?? null,
          parent: page.parent ?? null,
          title: page.title ?? null,
          description: page.description ?? null,
        })),
      }),
    )
    await expect(scratchPadConnection(exportPad, network).pages()).resolves.toStrictEqual(
      pageSummaries,
    )
    expect(network.fetched).toStrictEqual([`${api}/pages`])
  })

  it('reads one page from its encoded address when a page is asked for', async () => {
    const page = {
      page: 'pages/retry limit.md',
      title: null,
      html: '<p>5 retries</p>',
      headings: [],
      links: [{ kind: 'other', href: 'https://example.com', line: 1 }],
      decisions: [{ id: 'd-1', question: null, answer: null }],
    }
    const network = networkReturning(jsonResponse(page))
    const viewed = await scratchPadConnection(exportPad, network).page('retry limit.md')
    expect(network.fetched).toStrictEqual([`${api}/pages/retry%20limit.md`])
    expect(viewed.decisions).toStrictEqual([{ id: 'd-1', question: undefined, answer: undefined }])
  })

  it('reads the progress tracker and the log of decisions when they are asked for', async () => {
    const tracker = scratchPadConnection(exportPad, networkReturning(jsonResponse(progressTracker)))
    const log = scratchPadConnection(
      exportPad,
      networkReturning(
        jsonResponse({ decisions: decisionLog.map((entry) => ({ ...entry, decision: null })) }),
      ),
    )
    await expect(tracker.progressTracker()).resolves.toStrictEqual(progressTracker)
    await expect(log.decisionLog()).resolves.toStrictEqual(decisionLog)
  })

  it('reads the improvements from their address when they are asked for', async () => {
    const body = JSON.stringify(improvements, (_key, value: unknown) => value ?? null)
    const network = networkReturning(new Response(body))
    await expect(scratchPadConnection(exportPad, network).improvements()).resolves.toStrictEqual(
      improvements,
    )
    expect(network.fetched).toStrictEqual([`${api}/improvements`])
  })

  it('throws ScratchPadRequestError with the error of the server when the server returns an error', async () => {
    const network = networkReturning(
      jsonResponse({ error: "The page queue.md doesn't exist." }, 404),
    )
    const reading = scratchPadConnection(exportPad, network).page('queue.md')
    await expect(reading).rejects.toThrow(ScratchPadRequestError)
    await expect(reading).rejects.toThrow(
      `The server returned 404 for ${api}/pages/queue.md: The page queue.md doesn't exist.`,
    )
  })

  it('throws ScratchPadRequestError when the error of the server has an unexpected body', async () => {
    const reading = scratchPadConnection(exportPad, networkReturning(jsonResponse([], 500))).pages()
    await expect(reading).rejects.toThrow(ScratchPadRequestError)
    await expect(reading).rejects.toThrow(
      `The server returned 500 for ${api}/pages: the response has an unexpected body`,
    )
  })

  it('throws ServerUnreachableError with a sentence for Nick when the request itself fails', async () => {
    const network: BrowserNetwork = {
      fetch: () => Promise.reject(new DOMException('Failed to fetch', 'NetworkError')),
      openChangeStream: () => ({ addEventListener: () => undefined, close: () => undefined }),
    }
    const replying = scratchPadConnection(exportPad, network).replyToThread('c-1', 'Is 8 enough?')
    await expect(replying).rejects.toThrow(ServerUnreachableError)
    await expect(replying).rejects.toThrow(
      'The server didn’t respond. Ask the agent to start it again with scratch-pad start.',
    )
  })

  it('passes each known change to the listener and closes the stream when the listener stops', () => {
    const listeners: Array<(event: MessageEvent) => void> = []
    const close = vi.fn<() => void>()
    const opened: string[] = []
    const network: BrowserNetwork = {
      fetch: () => Promise.reject(new DOMException('offline')),
      openChangeStream: (url) => {
        opened.push(url)
        return { addEventListener: (_type, listener) => listeners.push(listener), close }
      },
    }
    const changes: unknown[] = []
    const stop = scratchPadConnection(exportPad, network).onChange({
      changed: (change) => changes.push(change),
      connection: () => undefined,
    })
    listeners.forEach((listener) => {
      listener(new MessageEvent('message', { data: '{"kind":"page","page":"pages/index.md"}' }))
      listener(new MessageEvent('message', { data: '{"kind":"comment"}' }))
    })
    stop()
    expect(opened).toStrictEqual([`${api}/changes`])
    expect(changes).toStrictEqual([{ kind: 'page', page: 'pages/index.md' }])
    expect(close).toHaveBeenCalledWith()
  })

  it('tells the listener once that the stream was lost and once that it is back when the server stops and starts again', () => {
    const listeners = new Map<string, Array<(event: MessageEvent) => void>>()
    const network: BrowserNetwork = {
      fetch: () => Promise.reject(new DOMException('offline')),
      openChangeStream: () => ({
        addEventListener: (type, listener) =>
          listeners.set(type, [...(listeners.get(type) ?? []), listener]),
        close: () => undefined,
      }),
    }
    const connections: boolean[] = []
    scratchPadConnection(exportPad, network).onChange({
      changed: () => undefined,
      connection: (connected) => connections.push(connected),
    })
    const fire = (type: string): void =>
      listeners.get(type)?.forEach((listener) => listener(new MessageEvent(type)))
    ;['open', 'error', 'error', 'open', 'open'].forEach(fire)
    expect(connections).toStrictEqual([false, true])
  })
})

interface SentRequest {
  readonly url: string
  readonly method: string | undefined
  readonly body: string | undefined
}

function networkWith(body: unknown): BrowserNetwork & { readonly sent: SentRequest[] } {
  const sent: SentRequest[] = []
  return {
    sent,
    fetch: (url, request) => {
      sent.push({ url, method: request?.method, body: request?.body })
      return Promise.resolve(jsonResponse(body))
    },
    openChangeStream: () => ({ addEventListener: () => undefined, close: () => undefined }),
  }
}

const storedThread = { ...retryQuestion, outcome: null }
const threadWithoutPosition = { ...storedThread, anchor: null, position: null }

describe('scratchPadConnection for threads and decisions', () => {
  it('reads the threads of a page and Nick’s Inbox with null turned into undefined', async () => {
    const threads = scratchPadConnection(exportPad, networkWith({ threads: [storedThread] }))
    const inbox = scratchPadConnection(
      exportPad,
      networkWith({ threads: [threadWithoutPosition], decisions: [] }),
    )
    await expect(threads.threads('index.md')).resolves.toStrictEqual([retryQuestion])
    const [noted] = (await inbox.nickInbox()).threads
    expect([noted?.anchor, noted?.position]).toStrictEqual([undefined, undefined])
  })

  it('posts a new comment with its anchor as JSON and returns the stored thread', async () => {
    const network = networkWith({ thread: storedThread })
    const comment = {
      type: 'comment',
      page: 'pages/index.md',
      firstLine: 8,
      lastLine: 8,
      selectedText: 'retries 5 times',
      prefix: 'The job',
      suffix: '. See this section',
      message: 'Is 5 retries enough?',
    } as const
    await expect(
      scratchPadConnection(exportPad, network).startThread(comment),
    ).resolves.toStrictEqual(retryQuestion)
    expect(network.sent).toStrictEqual([
      { url: `${api}/threads`, method: 'POST', body: JSON.stringify(comment) },
    ])
  })

  it('posts a reply and a resolve to the address of the thread', async () => {
    const network = networkWith({ thread: storedThread })
    const connection = scratchPadConnection(exportPad, network)
    await connection.replyToThread('c-1', 'Thanks.')
    await connection.resolveThread('c-1')
    expect(network.sent).toStrictEqual([
      { url: `${api}/threads/c-1/replies`, method: 'POST', body: '{"message":"Thanks."}' },
      { url: `${api}/threads/c-1/resolve`, method: 'POST', body: '{}' },
    ])
  })

  it('posts Nick’s choice with the page to the address of the decision', async () => {
    const network = networkWith({ decision: { id: 'd-1' } })
    await scratchPadConnection(exportPad, network).answerDecision('d-1', 'pages/index.md', {
      choice: 'proposal',
    })
    expect(network.sent).toStrictEqual([
      {
        url: `${api}/decisions/d-1`,
        method: 'POST',
        body: '{"page":"pages/index.md","choice":"proposal"}',
      },
    ])
  })

  it('posts the title and the details of the edit to the address of the improvement', async () => {
    const network = networkWith({ improvement: { number: 3 } })
    await scratchPadConnection(exportPad, network).editImprovement(3, {
      title: 'The export skips files.',
      details: 'Run it.',
    })
    expect(network.sent).toStrictEqual([
      {
        url: `${api}/improvements/3`,
        method: 'POST',
        body: '{"title":"The export skips files.","details":"Run it."}',
      },
    ])
  })

  it('posts to the delete address of the improvement when Nick deletes it', async () => {
    const network = networkWith({ deleted: 3 })
    await scratchPadConnection(exportPad, network).deleteImprovement(3)
    expect(network.sent).toStrictEqual([
      { url: `${api}/improvements/3/delete`, method: 'POST', body: '{}' },
    ])
  })
  it('reads the outbox from its address with null turned into undefined', async () => {
    const outbox = { items: [queuedComment, queuedReply] }
    const network = networkReturning(
      new Response(JSON.stringify(outbox, (_key, value: unknown) => value ?? null)),
    )
    await expect(scratchPadConnection(exportPad, network).outbox()).resolves.toStrictEqual(outbox)
    expect(network.fetched).toStrictEqual([`${api}/outbox`])
  })

  it('posts a queued comment, a queued reply, an edit and a removal to the addresses of the outbox', async () => {
    const network = networkWith({ items: [] })
    const connection = scratchPadConnection(exportPad, network)
    const comment = {
      type: 'comment',
      page: 'pages/index.md',
      firstLine: 3,
      lastLine: 4,
      selectedText: 'paid invoices',
      prefix: 'The export job writes the',
      suffix: 'of each shop',
      message: 'Only the paid ones?',
    } as const
    await connection.queueComment(comment)
    await connection.queueReply('c-1', 'Can a shop ask for 10?')
    await connection.editQueuedItem(2, 'Can a shop ask for 12?')
    await connection.removeQueuedItem(2)
    expect(network.sent).toStrictEqual([
      { url: `${api}/outbox/comments`, method: 'POST', body: JSON.stringify(comment) },
      {
        url: `${api}/outbox/replies`,
        method: 'POST',
        body: '{"thread":"c-1","message":"Can a shop ask for 10?"}',
      },
      { url: `${api}/outbox/2`, method: 'POST', body: '{"message":"Can a shop ask for 12?"}' },
      { url: `${api}/outbox/2/delete`, method: 'POST', body: '{}' },
    ])
  })

  it('posts to the send address of the outbox and returns the sent threads', async () => {
    const network = networkWith({ threads: [storedThread] })
    await expect(scratchPadConnection(exportPad, network).sendOutbox()).resolves.toStrictEqual([
      retryQuestion,
    ])
    expect(network.sent).toStrictEqual([{ url: `${api}/outbox/send`, method: 'POST', body: '{}' }])
  })
})
