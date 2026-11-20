import { pageSummaries } from '../agent-commands/page-commands'
import { type DecisionAnswer } from '../decisions/decision-answer'
import {
  nickAnswersDecision,
  nickComments,
  nickReplies,
  nickResolves,
} from '../nick-actions/nick-actions'
import {
  decisionLogOf,
  nickInboxItems,
  progressTrackerOf,
  threadsOfPage,
  viewPage,
} from '../nick-views/nick-views'
import { ScratchPadError } from '../scratch-pad-error'
import { type ScratchPadFolder } from '../scratch-pad-folder/scratch-pad-folder'
import {
  chooseScratchPad,
  scratchPadNames,
  UnknownScratchPadError,
} from '../scratch-pads-home/scratch-pads-home'
import { browserPageHtml, homePageHtml } from './browser-page'
import {
  answerRequestFrom,
  commentRequestFrom,
  RequestBody,
  type AnswerRequest,
} from './request-body'

export type ApiResponse =
  | { readonly kind: 'json'; readonly status: number; readonly body: unknown }
  | { readonly kind: 'html'; readonly html: string }
  | { readonly kind: 'redirect'; readonly location: string }
  | { readonly kind: 'changes'; readonly folder: ScratchPadFolder }

interface ApiRequest {
  readonly home: string
  readonly method: string
  readonly path: string
  readonly body: string
}

interface Route {
  readonly method: 'GET' | 'POST'
  readonly path: RegExp
  readonly respond: (request: ApiRequest, ...parts: string[]) => ApiResponse
}

export class UnknownRouteError extends ScratchPadError {
  constructor(method: string, path: string) {
    super(`There isn't any route for ${method} ${path}.`)
  }
}

export class InvalidPathError extends ScratchPadError {
  constructor(part: string) {
    super(`The path contains "${part}", which isn't a valid URL part.`)
  }
}

export class UnknownDecisionBlockError extends ScratchPadError {
  constructor(id: string, page: string) {
    super(`There isn't any decision ${id} on ${page}.`)
  }
}

export class DecisionWithoutQuestionError extends ScratchPadError {
  constructor(id: string, page: string) {
    super(
      `Decision ${id} on ${page} doesn't have a heading above it, so it can't be answered. The agent has to add a heading with the question.`,
    )
  }
}

function json(body: unknown, status = 200): ApiResponse {
  return { kind: 'json', status, body }
}

function html(text: string): ApiResponse {
  return { kind: 'html', html: text }
}

function padFolder(request: ApiRequest, name: string): ScratchPadFolder {
  const names = scratchPadNames(request.home)
  if (!names.includes(name)) {
    throw new UnknownScratchPadError(name, request.home, names)
  }
  return chooseScratchPad(request.home, name)
}

function bodyOf(request: ApiRequest): RequestBody {
  return RequestBody.parse(request.body)
}

function nickAnswersDecisionBlock(
  folder: ScratchPadFolder,
  id: string,
  request: AnswerRequest,
): DecisionAnswer {
  const page = viewPage(folder, request.page)
  const block = page.decisions.find((decision) => decision.id === id)
  if (block === undefined) {
    throw new UnknownDecisionBlockError(id, page.page)
  }
  if (block.question === undefined) {
    throw new DecisionWithoutQuestionError(id, page.page)
  }
  return nickAnswersDecision(folder, {
    page: page.page,
    line: block.firstLine,
    question: block.question,
    answer: request.answer,
  })
}

const padApi = String.raw`^/api/scratch-pads/([^/]+)`

function padRoute(
  method: Route['method'],
  path: string,
  respond: (folder: ScratchPadFolder, request: ApiRequest, ...parts: string[]) => ApiResponse,
): Route {
  return {
    method,
    path: new RegExp(`${padApi}${path}$`),
    respond: (request, pad, ...parts) => respond(padFolder(request, pad), request, ...parts),
  }
}

const routes: readonly Route[] = [
  {
    method: 'GET',
    path: /^\/$/,
    respond: (request) => html(homePageHtml(request.home, scratchPadNames(request.home))),
  },
  {
    method: 'GET',
    path: /^\/api\/server$/,
    respond: (request) => json({ home: request.home, pid: process.pid }),
  },
  {
    method: 'GET',
    path: /^\/api\/scratch-pads$/,
    respond: (request) => json({ scratchPads: scratchPadNames(request.home) }),
  },
  padRoute('GET', '/pages', (folder) => json({ pages: pageSummaries(folder) })),
  padRoute('GET', '/pages/([^/]+)', (folder, _request, file) => json(viewPage(folder, file))),
  padRoute('GET', '/pages/([^/]+)/threads', (folder, _request, file) =>
    json({ threads: threadsOfPage(folder, file) }),
  ),
  padRoute('GET', '/nick-inbox', (folder) => json(nickInboxItems(folder))),
  padRoute('GET', '/progress-tracker', (folder) => json(progressTrackerOf(folder))),
  padRoute('GET', '/decision-log', (folder) => json({ decisions: decisionLogOf(folder) })),
  padRoute('GET', '/changes', (folder) => ({ kind: 'changes', folder })),
  padRoute('POST', '/threads', (folder, request) =>
    json({ thread: nickComments(folder, commentRequestFrom(bodyOf(request))) }, 201),
  ),
  padRoute('POST', '/threads/([^/]+)/replies', (folder, request, id) =>
    json({ thread: nickReplies(folder, id, bodyOf(request).text('message')) }),
  ),
  padRoute('POST', '/threads/([^/]+)/resolve', (folder, _request, id) =>
    json({ thread: nickResolves(folder, id) }),
  ),
  padRoute('POST', '/decisions/([^/]+)', (folder, request, id) =>
    json({
      decision: nickAnswersDecisionBlock(folder, id, answerRequestFrom(bodyOf(request))),
    }),
  ),
  {
    method: 'GET',
    path: /^\/(?!api$)([^/]+)$/,
    respond: (request, pad) => ({
      kind: 'redirect',
      location: `/${encodeURIComponent(padFolder(request, pad).name)}/`,
    }),
  },
  {
    method: 'GET',
    path: /^\/(?!api\/)([^/]+)\/([^/]*)$/,
    respond: (request, pad, file) => {
      const folder = padFolder(request, pad)
      return html(browserPageHtml(folder.name, viewPage(folder, file || 'index.md')))
    },
  },
]

export function respondToApiRequest(request: ApiRequest): ApiResponse {
  const path = new URL(request.path, 'http://localhost').pathname
  for (const route of routes) {
    const match = route.method === request.method ? route.path.exec(path) : null
    if (match !== null) {
      return route.respond(request, ...match.slice(1).map(decodedPart))
    }
  }
  throw new UnknownRouteError(request.method, path)
}

function decodedPart(part: string): string {
  try {
    return decodeURIComponent(part)
  } catch {
    throw new InvalidPathError(part)
  }
}
