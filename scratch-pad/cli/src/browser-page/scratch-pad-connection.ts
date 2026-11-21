import { type z } from 'zod'
import {
  decisionAnswerResponse,
  decisionLogResponse,
  errorResponse,
  nickInboxResponse,
  padChange,
  pagesResponse,
  progressTrackerResponse,
  threadResponse,
  threadsResponse,
  viewedPageResponse,
  type Answer,
  type DecisionLogEntry,
  type NickInbox,
  type PadChange,
  type PageSummary,
  type ProgressTracker,
  type Thread,
  type ThreadType,
  type ViewedPage,
} from './api-responses'
import { BrowserPageError } from './browser-page-error'

export interface NewThread {
  readonly type: ThreadType
  readonly page: string
  readonly firstLine: number
  readonly lastLine: number
  readonly selectedText: string
  readonly prefix: string
  readonly suffix: string
  readonly message: string
}

export interface ChangeListeners {
  readonly changed: (change: PadChange) => void
  readonly connection: (connected: boolean) => void
}

export interface ScratchPadReading {
  readonly pages: () => Promise<PageSummary[]>
  readonly page: (file: string) => Promise<ViewedPage>
  readonly threads: (file: string) => Promise<Thread[]>
  readonly nickInbox: () => Promise<NickInbox>
  readonly progressTracker: () => Promise<ProgressTracker>
  readonly decisionLog: () => Promise<DecisionLogEntry[]>
  readonly onChange: (listeners: ChangeListeners) => () => void
}

export interface ScratchPadWriting {
  readonly startThread: (thread: NewThread) => Promise<Thread>
  readonly replyToThread: (id: string, message: string) => Promise<Thread>
  readonly resolveThread: (id: string) => Promise<Thread>
  readonly answerDecision: (id: string, page: string, answer: Answer) => Promise<void>
}

export type ScratchPadConnection = ScratchPadReading & ScratchPadWriting

interface ChangeStream {
  readonly addEventListener: (
    type: 'message' | 'open' | 'error',
    listener: (event: MessageEvent) => void,
  ) => void
  readonly close: () => void
}

interface PostRequest {
  readonly method: 'POST'
  readonly headers: Readonly<Record<string, string>>
  readonly body: string
}

export interface BrowserNetwork {
  readonly fetch: (url: string, request?: PostRequest) => Promise<Response>
  readonly openChangeStream: (url: string) => ChangeStream
}

export class ScratchPadRequestError extends BrowserPageError {
  constructor(url: string, status: number, problem: string) {
    super(`The server returned ${status} for ${url}: ${problem}`)
  }
}

export class ServerUnreachableError extends BrowserPageError {
  constructor() {
    super('The server didn’t respond. Ask the agent to start it again with scratch-pad start.')
  }
}

async function responseOf(
  network: BrowserNetwork,
  url: string,
  request: PostRequest | undefined,
): Promise<Response> {
  try {
    return await network.fetch(url, request)
  } catch {
    throw new ServerUnreachableError()
  }
}

async function readJson<T>(
  network: BrowserNetwork,
  url: string,
  schema: z.ZodType<T>,
  request?: PostRequest,
): Promise<T> {
  const response = await responseOf(network, url, request)
  const body: unknown = await response.json()
  if (!response.ok) {
    const error = errorResponse.safeParse(body)
    throw new ScratchPadRequestError(
      url,
      response.status,
      error.success ? error.data.error : 'the response has an unexpected body',
    )
  }
  return schema.parse(body)
}

function postOf(body: unknown): PostRequest {
  return {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }
}

export function scratchPadConnection(pad: string, network: BrowserNetwork): ScratchPadConnection {
  const api = `/api/scratch-pads/${encodeURIComponent(pad)}`
  const threadUrl = (id: string): string => `${api}/threads/${encodeURIComponent(id)}`
  return {
    pages: async () => (await readJson(network, `${api}/pages`, pagesResponse)).pages,
    page: (file) =>
      readJson(network, `${api}/pages/${encodeURIComponent(file)}`, viewedPageResponse),
    threads: async (file) =>
      (await readJson(network, `${api}/pages/${encodeURIComponent(file)}/threads`, threadsResponse))
        .threads,
    nickInbox: () => readJson(network, `${api}/nick-inbox`, nickInboxResponse),
    progressTracker: () => readJson(network, `${api}/progress-tracker`, progressTrackerResponse),
    decisionLog: async () =>
      (await readJson(network, `${api}/decision-log`, decisionLogResponse)).decisions,
    startThread: async (thread) =>
      (await readJson(network, `${api}/threads`, threadResponse, postOf(thread))).thread,
    replyToThread: async (id, message) =>
      (await readJson(network, `${threadUrl(id)}/replies`, threadResponse, postOf({ message })))
        .thread,
    resolveThread: async (id) =>
      (await readJson(network, `${threadUrl(id)}/resolve`, threadResponse, postOf({}))).thread,
    answerDecision: async (id, page, answer) => {
      await readJson(
        network,
        `${api}/decisions/${encodeURIComponent(id)}`,
        decisionAnswerResponse,
        postOf({ page, ...answer }),
      )
    },
    onChange: (listeners) => {
      const stream = network.openChangeStream(`${api}/changes`)
      const state = { connected: true }
      const connectedIs = (connected: boolean) => (): void => {
        if (state.connected !== connected) {
          state.connected = connected
          listeners.connection(connected)
        }
      }
      stream.addEventListener('open', connectedIs(true))
      stream.addEventListener('error', connectedIs(false))
      stream.addEventListener('message', (event) => {
        const change = padChange.safeParse(JSON.parse(String(event.data)))
        if (change.success) {
          listeners.changed(change.data)
        }
      })
      return () => stream.close()
    },
  }
}
