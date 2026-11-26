import { type Answer, type DecisionAnswer } from '../decisions/decision-answer'
import { type DecisionReview } from '../decisions/decision-review'
import { type DecisionBlock } from '../rendered-page/decision-block'
import {
  nickAnswersDecision,
  nickRequestsChanges,
  nickComments,
  nickCommentsOnTask,
  nickDeletesImprovement,
  nickEditsImprovement,
  nickEditsQueuedItem,
  nickFinishesTask,
  nickMarksPageRead,
  nickMarksPageUnread,
  nickMarksSectionRead,
  nickQueuesComment,
  nickQueuesReply,
  nickRemovesQueuedItem,
  nickReplies,
  nickResolves,
  nickSendsOutbox,
} from '../nick-actions/nick-actions'
import {
  decisionLogOf,
  decisionsOfPad,
  improvementsOf,
  nickInboxItems,
  outboxOf,
  pageSummaries,
  readMarksOf,
  searchPages,
  threadsOfPad,
  threadsOfPage,
  viewPage,
  withPositions,
} from '../nick-views/nick-views'
import { progressTrackerOf } from '../nick-views/progress-tracker-of'
import { ScratchPadError } from '../scratch-pad-error'
import { type ScratchPadFolder } from '../scratch-pad-folder/scratch-pad-folder'
import {
  chooseScratchPad,
  scratchPadNames,
  UnknownScratchPadError,
} from '../scratch-pads-home/scratch-pads-home'
import { type Thread } from '../threads/thread'
import { browserPageHtml, homePageHtml } from './browser-page'
import { toolBuild } from './tool-build'
import {
  answerRequestFrom,
  commentRequestFrom,
  improvementEditFrom,
  RequestBody,
  reviewRequestFrom,
  sectionHashesFrom,
  type AnswerRequest,
  type ReviewRequest,
} from './request-body'

export type ApiResponse =
  | { readonly kind: 'json'; readonly status: number; readonly body: unknown }
  | { readonly kind: 'html'; readonly html: string }
  | { readonly kind: 'redirect'; readonly location: string }
  | { readonly kind: 'changes'; readonly folder: ScratchPadFolder }
  | { readonly kind: 'browser-page-bundle'; readonly part: 'script' | 'stylesheet' }
  | { readonly kind: 'html-block-frame' }

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

export class UnknownChoiceError extends ScratchPadError {
  constructor(id: string, choice: string, page: string, valid: readonly string[]) {
    super(
      `Decision ${id} on ${page} doesn't have the choice ${choice}. The choices are ${valid.join(', ')}.`,
    )
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

interface DecisionBlockOnPage {
  readonly block: DecisionBlock
  readonly question: string
  readonly page: string
}

function decisionBlockOn(folder: ScratchPadFolder, id: string, file: string): DecisionBlockOnPage {
  const page = viewPage(folder, file)
  const block = page.decisions.find((decision) => decision.id === id)
  if (block === undefined) {
    throw new UnknownDecisionBlockError(id, page.page)
  }
  if (block.question === undefined) {
    throw new DecisionWithoutQuestionError(id, page.page)
  }
  return { block, question: block.question, page: page.page }
}

function nickAnswersDecisionBlock(
  folder: ScratchPadFolder,
  id: string,
  request: AnswerRequest,
): DecisionAnswer {
  const { block, question, page } = decisionBlockOn(folder, id, request.page)
  assertChoiceOnDecision(block, request.answer, page)
  return nickAnswersDecision(
    folder,
    { id: block.id, page, line: block.firstLine, question, answer: request.answer },
    chosenOptionOf(block, request.answer),
  )
}

function nickRequestsDecisionBlockChanges(
  folder: ScratchPadFolder,
  id: string,
  request: ReviewRequest,
): DecisionReview {
  const { block, question, page } = decisionBlockOn(folder, id, request.page)
  return nickRequestsChanges(folder, {
    id: block.id,
    page,
    line: block.firstLine,
    question,
    reason: request.reason,
  })
}

// The text of the option that Nick chose. A decision page has options that are numbered, whereas
// an inline block has a proposal and an alternative.
function chosenOptionOf(block: DecisionBlock, answer: Answer): string | undefined {
  if (!('choice' in answer)) {
    return undefined
  }
  if (block.options === undefined) {
    return answer.choice === 'proposal' ? block.proposal : block.alternative
  }
  return block.options.find((option) => option.choice === answer.choice)?.label
}

function assertChoiceOnDecision(block: DecisionBlock, answer: Answer, page: string): void {
  if (!('choice' in answer)) {
    return
  }
  const valid =
    block.options === undefined
      ? ['proposal', 'alternative']
      : block.options.map((option) => option.choice)
  if (!valid.includes(answer.choice)) {
    throw new UnknownChoiceError(block.id, answer.choice, page, valid)
  }
}

function threadBody(folder: ScratchPadFolder, thread: Thread): { readonly thread: unknown } {
  const [positioned] = withPositions(folder, [thread])
  return { thread: positioned }
}

// A request without a query is searched in the same way as an empty query, which doesn't find
// anything.
function searchResultsFor(folder: ScratchPadFolder, request: ApiRequest): ApiResponse {
  const query = new URL(request.path, 'http://localhost').searchParams.get('query')
  return json({ results: query === null ? [] : searchPages(folder, query) })
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
    respond: (request) => json({ home: request.home, pid: process.pid, build: toolBuild }),
  },
  {
    method: 'GET',
    path: /^\/api\/scratch-pads$/,
    respond: (request) => json({ scratchPads: scratchPadNames(request.home) }),
  },
  padRoute('GET', '/pages', (folder) => json({ pages: pageSummaries(folder) })),
  padRoute('GET', '/pages/([^/]+)', (folder, _request, file) => json(viewPage(folder, file))),
  padRoute('GET', '/search', searchResultsFor),
  padRoute('GET', '/pages/([^/]+)/threads', (folder, _request, file) =>
    json({ threads: threadsOfPage(folder, file) }),
  ),
  padRoute('GET', '/nick-inbox', (folder) => json(nickInboxItems(folder))),
  padRoute('GET', '/progress-tracker', (folder) => json(progressTrackerOf(folder))),
  padRoute('GET', '/decision-log', (folder) => json({ decisions: decisionLogOf(folder) })),
  padRoute('GET', '/decisions', (folder) => json(decisionsOfPad(folder))),
  padRoute('GET', '/improvements', (folder) => json(improvementsOf(folder))),
  padRoute('GET', '/outbox', (folder) => json(outboxOf(folder))),
  padRoute('GET', '/read-marks', (folder) => json(readMarksOf(folder))),
  padRoute('GET', '/threads', (folder) => json({ threads: threadsOfPad(folder) })),
  padRoute('GET', '/changes', (folder) => ({ kind: 'changes', folder })),
  padRoute('POST', '/threads', (folder, request) =>
    json(threadBody(folder, nickComments(folder, commentRequestFrom(bodyOf(request)))), 201),
  ),
  padRoute('POST', '/threads/([^/]+)/replies', (folder, request, id) =>
    json(threadBody(folder, nickReplies(folder, id, bodyOf(request).messageText('message')))),
  ),
  padRoute('POST', '/threads/([^/]+)/resolve', (folder, _request, id) =>
    json(threadBody(folder, nickResolves(folder, id))),
  ),
  padRoute('POST', '/decisions/([^/]+)', (folder, request, id) =>
    json({
      decision: nickAnswersDecisionBlock(folder, id, answerRequestFrom(bodyOf(request))),
    }),
  ),
  padRoute('POST', '/decisions/([^/]+)/request-changes', (folder, request, id) =>
    json({
      decision: nickRequestsDecisionBlockChanges(folder, id, reviewRequestFrom(bodyOf(request))),
    }),
  ),
  padRoute('POST', '/tasks/([^/]+)/threads', (folder, request, id) =>
    json(
      threadBody(folder, nickCommentsOnTask(folder, id, bodyOf(request).messageText('message'))),
      201,
    ),
  ),
  padRoute('POST', '/tasks/([^/]+)/done', (folder, _request, id) =>
    json({ task: nickFinishesTask(folder, id) }),
  ),
  padRoute('POST', '/improvements/([0-9]+)', (folder, request, number) =>
    json({
      improvement: nickEditsImprovement(
        folder,
        Number(number),
        improvementEditFrom(bodyOf(request)),
      ),
    }),
  ),
  padRoute('POST', '/improvements/([0-9]+)/delete', (folder, _request, number) => {
    nickDeletesImprovement(folder, Number(number))
    return json({ deleted: Number(number) })
  }),
  padRoute('POST', '/outbox/comments', (folder, request) => {
    nickQueuesComment(folder, commentRequestFrom(bodyOf(request)))
    return json(outboxOf(folder), 201)
  }),
  padRoute('POST', '/outbox/replies', (folder, request) => {
    const body = bodyOf(request)
    nickQueuesReply(folder, body.text('thread'), body.messageText('message'))
    return json(outboxOf(folder), 201)
  }),
  padRoute('POST', '/outbox/([0-9]+)', (folder, request, number) => {
    nickEditsQueuedItem(folder, Number(number), bodyOf(request).messageText('message'))
    return json(outboxOf(folder))
  }),
  padRoute('POST', '/outbox/([0-9]+)/delete', (folder, _request, number) => {
    nickRemovesQueuedItem(folder, Number(number))
    return json(outboxOf(folder))
  }),
  // The browser reads the read marks again after it has marked a page or a section, so these routes
  // only return the page rather than the read marks of every page.
  padRoute('POST', '/pages/([^/]+)/read', (folder, request, file) => {
    nickMarksPageRead(folder, file, sectionHashesFrom(bodyOf(request)))
    return json({ page: file })
  }),
  padRoute('POST', '/pages/([^/]+)/unread', (folder, _request, file) => {
    nickMarksPageUnread(folder, file)
    return json({ page: file })
  }),
  padRoute('POST', '/pages/([^/]+)/sections/([^/]+)/read', (folder, request, file, section) => {
    nickMarksSectionRead(folder, file, { id: section, hash: bodyOf(request).text('hash') })
    return json({ page: file })
  }),
  padRoute('POST', '/outbox/send', (folder) =>
    json({ threads: withPositions(folder, nickSendsOutbox(folder)) }),
  ),
  {
    method: 'GET',
    path: /^\/browser-page\/scratch-pad\.js$/,
    respond: () => ({ kind: 'browser-page-bundle', part: 'script' }),
  },
  {
    method: 'GET',
    path: /^\/browser-page\/scratch-pad\.css$/,
    respond: () => ({ kind: 'browser-page-bundle', part: 'stylesheet' }),
  },
  {
    method: 'GET',
    path: /^\/browser-page\/html-block-frame\.html$/,
    respond: () => ({ kind: 'html-block-frame' }),
  },
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
    path: /^\/(?!api\/)([^/]+)\/[^/]*$/,
    respond: (request, pad) => html(browserPageHtml(padFolder(request, pad).name)),
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
