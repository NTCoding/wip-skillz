import { type z } from 'zod'
import {
  decisionAnswerResponse,
  decisionLogResponse,
  errorResponse,
  improvementDeleteResponse,
  improvementEditResponse,
  improvementsResponse,
  markedPageResponse,
  nickInboxResponse,
  outboxResponse,
  padChange,
  pagesResponse,
  progressTrackerResponse,
  readMarksResponse,
  searchResponse,
  taskDoneResponse,
  threadResponse,
  threadsOfPadResponse,
  threadsResponse,
  viewedPageResponse,
  type Answer,
  type DecisionLogEntry,
  type Improvements,
  type NickInbox,
  type Outbox,
  type PadChange,
  type PageSummary,
  type ProgressTracker,
  type ReadMarks,
  type SearchResult,
  type SectionHash,
  type Thread,
  type ThreadOfPad,
  type ThreadType,
  type ViewedPage,
} from './api-responses'
import { BrowserPageError } from './browser-page-error'
import { type ImprovementEdit } from './design-system/design-system'

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
  readonly improvements: () => Promise<Improvements>
  readonly outbox: () => Promise<Outbox>
  readonly readMarks: () => Promise<ReadMarks>
  readonly threadsOfPad: () => Promise<ThreadOfPad[]>
  readonly onChange: (listeners: ChangeListeners) => () => void
}

export interface ScratchPadWriting {
  readonly startThread: (thread: NewThread) => Promise<Thread>
  readonly replyToThread: (id: string, message: string) => Promise<Thread>
  readonly resolveThread: (id: string) => Promise<Thread>
  readonly answerDecision: (id: string, page: string, answer: Answer) => Promise<void>
  // Nick marks a task or a subtask that is assigned to him as done.
  readonly markTaskDone: (id: string) => Promise<void>
  readonly editImprovement: (number: number, edit: ImprovementEdit) => Promise<void>
  readonly deleteImprovement: (number: number) => Promise<void>
  readonly queueComment: (thread: NewThread) => Promise<void>
  readonly queueReply: (id: string, message: string) => Promise<void>
  readonly editQueuedItem: (number: number, message: string) => Promise<void>
  readonly removeQueuedItem: (number: number) => Promise<void>
  readonly sendOutbox: () => Promise<Thread[]>
  readonly markPageRead: (file: string, sections: readonly SectionHash[]) => Promise<void>
  readonly markPageUnread: (file: string) => Promise<void>
  readonly markSectionRead: (file: string, section: SectionHash) => Promise<void>
}

// The export doesn't have a search, because only the server reads the Markdown of the pages.
export interface ScratchPadSearch {
  readonly search: (query: string) => Promise<SearchResult[]>
}

export type ScratchPadConnection = ScratchPadReading & ScratchPadWriting & ScratchPadSearch

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
  const pageUrl = (file: string): string => `${api}/pages/${encodeURIComponent(file)}`
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
    improvements: () => readJson(network, `${api}/improvements`, improvementsResponse),
    outbox: () => readJson(network, `${api}/outbox`, outboxResponse),
    readMarks: () => readJson(network, `${api}/read-marks`, readMarksResponse),
    threadsOfPad: async () =>
      (await readJson(network, `${api}/threads`, threadsOfPadResponse)).threads,
    search: async (query) =>
      (await readJson(network, `${api}/search?query=${encodeURIComponent(query)}`, searchResponse))
        .results,
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
    markTaskDone: async (id) => {
      await readJson(
        network,
        `${api}/tasks/${encodeURIComponent(id)}/done`,
        taskDoneResponse,
        postOf({}),
      )
    },
    editImprovement: async (number, edit) => {
      await readJson(
        network,
        `${api}/improvements/${number}`,
        improvementEditResponse,
        postOf(edit),
      )
    },
    deleteImprovement: async (number) => {
      await readJson(
        network,
        `${api}/improvements/${number}/delete`,
        improvementDeleteResponse,
        postOf({}),
      )
    },
    queueComment: async (thread) => {
      await readJson(network, `${api}/outbox/comments`, outboxResponse, postOf(thread))
    },
    queueReply: async (id, message) => {
      await readJson(
        network,
        `${api}/outbox/replies`,
        outboxResponse,
        postOf({ thread: id, message }),
      )
    },
    editQueuedItem: async (number, message) => {
      await readJson(network, `${api}/outbox/${number}`, outboxResponse, postOf({ message }))
    },
    removeQueuedItem: async (number) => {
      await readJson(network, `${api}/outbox/${number}/delete`, outboxResponse, postOf({}))
    },
    sendOutbox: async () =>
      (await readJson(network, `${api}/outbox/send`, threadsResponse, postOf({}))).threads,
    markPageRead: async (file, sections) => {
      await readJson(network, `${pageUrl(file)}/read`, markedPageResponse, postOf({ sections }))
    },
    markPageUnread: async (file) => {
      await readJson(network, `${pageUrl(file)}/unread`, markedPageResponse, postOf({}))
    },
    markSectionRead: async (file, section) => {
      await readJson(
        network,
        `${pageUrl(file)}/sections/${encodeURIComponent(section.id)}/read`,
        markedPageResponse,
        postOf({ hash: section.hash }),
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
