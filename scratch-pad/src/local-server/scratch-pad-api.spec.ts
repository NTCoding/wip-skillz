import { afterEach, describe, expect, it } from 'vitest'
import {
  retryQuestion,
  taxQuestion,
  writeInvoiceDecisionsPage,
  writeRetryChoicesPage,
} from '../nick-views/nick-views-fixtures'
import {
  exportJobPadName,
  exportJobScratchPad,
  freezeClockAt,
  removeTemporaryHomes,
  temporaryHome,
  writeFileInPad,
} from '../scratch-pad-folder/scratch-pad-folder-fixtures'
import { chooseScratchPad, UnknownScratchPadError } from '../scratch-pads-home/scratch-pads-home'
import { retryAnchor } from '../threads/thread-fixtures'
import { toolBuild } from './tool-build'
import {
  DecisionWithoutQuestionError,
  InvalidPathError,
  respondToApiRequest,
  UnknownDecisionBlockError,
  UnknownRouteError,
  type ApiResponse,
} from './scratch-pad-api'

const time = '2026-03-14T09:30:00.000Z'
const padApi = `/api/scratch-pads/${exportJobPadName}`
const nickMessage = { author: 'nick', text: 'Is 5 retries enough?', time }

freezeClockAt(time)

afterEach(() => {
  removeTemporaryHomes()
})

function homeWithExportJob(): string {
  const home = temporaryHome()
  const folder = exportJobScratchPad(home)
  writeInvoiceDecisionsPage(folder)
  return home
}

function get(home: string, path: string): ApiResponse {
  return respondToApiRequest({ home, method: 'GET', path, body: '' })
}

function post(home: string, path: string, body: unknown): ApiResponse {
  return respondToApiRequest({ home, method: 'POST', path, body: JSON.stringify(body) })
}

function jsonBody(response: ApiResponse): unknown {
  return response.kind === 'json' ? response.body : response.kind
}

function postComment(home: string): ApiResponse {
  return post(home, `${padApi}/threads`, {
    type: 'comment',
    page: 'pages/index.md',
    ...retryAnchor,
    message: 'Is 5 retries enough?',
  })
}

describe('respondToApiRequest for the server and the scratch pads', () => {
  it('returns the home folder, the process id and the build when the server is asked who it is', () => {
    const home = temporaryHome()

    expect(get(home, '/api/server')).toStrictEqual({
      kind: 'json',
      status: 200,
      body: { home, pid: process.pid, build: toolBuild },
    })
  })

  it('returns the names of the scratch pads when the query string has other words', () => {
    expect(jsonBody(get(homeWithExportJob(), '/api/scratch-pads?sort=name'))).toStrictEqual({
      scratchPads: [exportJobPadName],
    })
  })

  it('returns an HTML page with a link to each scratch pad when the home address is asked for', () => {
    const response = get(homeWithExportJob(), '/')

    expect(response.kind === 'html' && response.html).toContain(
      `<li><a href="/${exportJobPadName}/">${exportJobPadName}</a></li>`,
    )
  })
})

describe('respondToApiRequest for the pages', () => {
  it('returns the pages with their titles and open threads when the pages are listed', () => {
    expect(jsonBody(get(homeWithExportJob(), `${padApi}/pages`))).toStrictEqual({
      pages: [
        { page: 'pages/index.md', title: 'Export job', openThreads: 0 },
        { page: 'pages/invoice-decisions.md', title: 'Invoice decisions', openThreads: 0 },
      ],
    })
  })

  it('returns the rendered page when one page is asked for', () => {
    const body = jsonBody(get(homeWithExportJob(), `${padApi}/pages/invoice-decisions.md`))

    expect(body).toMatchObject({
      page: 'pages/invoice-decisions.md',
      title: 'Invoice decisions',
      decisions: [{ id: 'd-1', answer: undefined }, { id: 'd-2' }],
    })
  })

  it('returns the threads of the page when the threads of a page are asked for', () => {
    const home = homeWithExportJob()
    postComment(home)

    expect(jsonBody(get(home, `${padApi}/pages/index.md/threads`))).toStrictEqual({
      threads: [
        {
          id: 'c-1',
          type: 'comment',
          page: 'pages/index.md',
          anchor: { ...retryAnchor, copiesOnPage: 1 },
          waitsFor: 'agent',
          outcome: undefined,
          messages: [nickMessage],
          position: {
            kind: 'attached',
            firstLine: 5,
            lastLine: 6,
            text: 'The export job retries 5 times.',
            occurrence: 0,
            match: 'exact',
            score: 1,
          },
        },
      ],
    })
  })

  it('returns the decisions that wait for Nick when Nick Inbox is asked for', () => {
    expect(jsonBody(get(homeWithExportJob(), `${padApi}/nick-inbox`))).toStrictEqual({
      threads: [],
      decisions: [
        { page: 'pages/invoice-decisions.md', id: 'd-1', line: 5, question: retryQuestion },
        {
          page: 'pages/invoice-decisions.md',
          id: 'd-2',
          line: 13,
          question: 'Should the invoice template show the tax number?',
        },
      ],
    })
  })

  it('returns the progress tracker and the log of decisions when they are asked for', () => {
    const home = homeWithExportJob()

    expect([
      jsonBody(get(home, `${padApi}/progress-tracker`)),
      jsonBody(get(home, `${padApi}/decision-log`)),
    ]).toStrictEqual([{ title: 'Export job', goal: undefined, tasks: [] }, { decisions: [] }])
  })

  it('returns the stream of changes of the scratch pad when the changes are asked for', () => {
    const response = get(homeWithExportJob(), `${padApi}/changes`)

    expect(response.kind === 'changes' && response.folder.name).toBe(exportJobPadName)
  })
})

describe('respondToApiRequest for the threads', () => {
  it('returns 201 and the new thread when Nick posts a comment', () => {
    expect(postComment(homeWithExportJob())).toMatchObject({
      status: 201,
      body: { thread: { id: 'c-1', waitsFor: 'agent', messages: [nickMessage] } },
    })
  })

  it('returns the current position of the new thread when Nick posts a comment', () => {
    expect(postComment(homeWithExportJob())).toMatchObject({
      body: { thread: { position: { kind: 'attached', firstLine: 5, lastLine: 6 } } },
    })
  })

  it('returns the thread that waits for the agent again when Nick posts a reply', () => {
    const home = homeWithExportJob()
    postComment(home)

    expect(post(home, `${padApi}/threads/c-1/replies`, { message: 'Or 6 retries?' })).toMatchObject(
      {
        status: 200,
        body: { thread: { waitsFor: 'agent', messages: [nickMessage, { text: 'Or 6 retries?' }] } },
      },
    )
  })

  it('returns the thread that waits for nobody when Nick resolves the thread', () => {
    const home = homeWithExportJob()
    postComment(home)

    expect(post(home, `${padApi}/threads/c-1/resolve`, {})).toMatchObject({
      status: 200,
      body: { thread: { id: 'c-1', waitsFor: 'nobody' } },
    })
  })
})

describe('respondToApiRequest for the decisions', () => {
  it('saves the answer with the line and the question of the decision block when Nick picks an option', () => {
    const home = homeWithExportJob()

    expect(
      post(home, `${padApi}/decisions/d-1`, {
        page: 'pages/invoice-decisions.md',
        choice: 'proposal',
      }),
    ).toStrictEqual({
      kind: 'json',
      status: 200,
      body: {
        decision: {
          id: 'd-1',
          page: 'pages/invoice-decisions.md',
          line: 5,
          question: retryQuestion,
          answer: { choice: 'proposal' },
          outcome: undefined,
          time,
        },
      },
    })
  })

  it('logs the text of the option when Nick picks the alternative', () => {
    const home = homeWithExportJob()
    post(home, `${padApi}/decisions/d-1`, { page: 'invoice-decisions', choice: 'alternative' })
    expect(jsonBody(get(home, `${padApi}/decision-log`))).toMatchObject({
      decisions: [
        { text: `${retryQuestion} Nick chose the alternative: Keep the retry limit at 5.` },
      ],
    })
  })

  it('logs the text of the option when Nick picks the proposal', () => {
    const home = homeWithExportJob()
    post(home, `${padApi}/decisions/d-1`, { page: 'invoice-decisions', choice: 'proposal' })
    expect(jsonBody(get(home, `${padApi}/decision-log`))).toMatchObject({
      decisions: [
        { text: `${retryQuestion} Nick chose the proposal: Raise the retry limit to 8.` },
      ],
    })
  })

  it('logs Nick’s own words when Nick writes his own answer', () => {
    const home = homeWithExportJob()
    post(home, `${padApi}/decisions/d-1`, { page: 'invoice-decisions', written: 'Retry 6 times.' })
    expect(jsonBody(get(home, `${padApi}/decision-log`))).toMatchObject({
      decisions: [{ text: `${retryQuestion} Nick wrote: Retry 6 times.` }],
    })
  })

  it('saves the answer under the id in the address when Nick answers d-2 before d-1', () => {
    const response = post(homeWithExportJob(), `${padApi}/decisions/d-2`, {
      page: 'invoice-decisions',
      choice: 'alternative',
    })

    expect(response).toMatchObject({
      status: 200,
      body: { decision: { id: 'd-2', line: 13, question: taxQuestion } },
    })
  })

  it('saves each answer under its own id when 2 decisions are under the same heading', () => {
    const home = homeWithExportJob()
    writeRetryChoicesPage(chooseScratchPad(home, exportJobPadName))
    post(home, `${padApi}/decisions/d-3`, { page: 'retry-choices', choice: 'proposal' })

    expect(
      post(home, `${padApi}/decisions/d-4`, { page: 'retry-choices', choice: 'alternative' }),
    ).toMatchObject({
      body: { decision: { id: 'd-4', line: 11, answer: { choice: 'alternative' } } },
    })
    expect(jsonBody(get(home, `${padApi}/pages/retry-choices.md`))).toMatchObject({
      decisions: [
        { id: 'd-3', answer: { choice: 'proposal' } },
        { id: 'd-4', answer: { choice: 'alternative' } },
      ],
    })
  })

  it('throws UnknownDecisionBlockError when the id in the address is the id of a comment', () => {
    const answer = () =>
      post(homeWithExportJob(), `${padApi}/decisions/c-1`, {
        page: 'invoice-decisions',
        choice: 'proposal',
      })

    expect(answer).toThrow(UnknownDecisionBlockError)
    expect(answer).toThrow("There isn't any decision c-1 on pages/invoice-decisions.md.")
  })

  it('throws UnknownDecisionBlockError when the page has no decision with that id', () => {
    const answer = () =>
      post(homeWithExportJob(), `${padApi}/decisions/d-9`, {
        page: 'invoice-decisions',
        written: 'Retry 6 times.',
      })

    expect(answer).toThrow(UnknownDecisionBlockError)
    expect(answer).toThrow("There isn't any decision d-9 on pages/invoice-decisions.md.")
  })

  it('throws DecisionWithoutQuestionError when the decision block has no heading above it', () => {
    const home = temporaryHome()
    writeFileInPad(
      exportJobScratchPad(home),
      'pages/index.md',
      ':::decision d-1\nproposal: Retry 8 times.\nalternative: Retry 5 times.\npick: proposal\n:::\n',
    )
    const answer = () =>
      post(home, `${padApi}/decisions/d-1`, { page: 'index', choice: 'proposal' })

    expect(answer).toThrow(DecisionWithoutQuestionError)
    expect(answer).toThrow("Decision d-1 on pages/index.md doesn't have a heading above it")
  })
})

describe('respondToApiRequest for the browser pages', () => {
  it('redirects to the address with a slash when the scratch pad address has no slash', () => {
    expect(get(homeWithExportJob(), `/${exportJobPadName}`)).toStrictEqual({
      kind: 'redirect',
      location: `/${exportJobPadName}/`,
    })
  })

  it('returns the HTML that starts the browser page when the address of the scratch pad is asked for', () => {
    const response = get(homeWithExportJob(), `/${exportJobPadName}/`)

    expect(response.kind === 'html' && response.html).toContain(
      `<div id="scratch-pad-page" data-scratch-pad="${exportJobPadName}"></div>`,
    )
  })

  it('returns the same HTML when the address of a tab of the scratch pad is asked for', () => {
    const tab = get(homeWithExportJob(), `/${exportJobPadName}/progress-tracker`)
    const index = get(homeWithExportJob(), `/${exportJobPadName}/`)

    expect(tab).toStrictEqual(index)
  })

  it('loads the script and the stylesheet of the bundle when the HTML of the browser page is returned', () => {
    const response = get(homeWithExportJob(), `/${exportJobPadName}/invoice-decisions.md`)

    expect(response.kind === 'html' && response.html).toContain(
      '<link rel="stylesheet" href="/browser-page/scratch-pad.css">',
    )
    expect(response.kind === 'html' && response.html).toContain(
      '<script type="module" src="/browser-page/scratch-pad.js"></script>',
    )
  })

  it('returns the script of the bundle when the browser asks for scratch-pad.js', () => {
    expect(get(temporaryHome(), '/browser-page/scratch-pad.js')).toStrictEqual({
      kind: 'browser-page-bundle',
      part: 'script',
    })
  })

  it('returns the stylesheet of the bundle when the browser asks for scratch-pad.css', () => {
    expect(get(temporaryHome(), '/browser-page/scratch-pad.css')).toStrictEqual({
      kind: 'browser-page-bundle',
      part: 'stylesheet',
    })
  })
})

describe('respondToApiRequest for the frame of an html block', () => {
  it('returns the frame of an html block when the browser asks for html-block-frame.html', () => {
    expect(get(temporaryHome(), '/browser-page/html-block-frame.html')).toStrictEqual({
      kind: 'html-block-frame',
    })
  })
})

describe('respondToApiRequest for a wrong request', () => {
  it('throws UnknownRouteError when the method does not match the route', () => {
    const request = () => post(homeWithExportJob(), '/api/server', {})

    expect(request).toThrow(UnknownRouteError)
    expect(request).toThrow("There isn't any route for POST /api/server.")
  })

  it.each(['/api/scratch-pads/..%2F..%2Fetc/pages', '/2026-03-14-unknown/'])(
    'throws UnknownScratchPadError when the path is %s',
    (path) => {
      expect(() => get(homeWithExportJob(), path)).toThrow(UnknownScratchPadError)
      expect(() => get(homeWithExportJob(), path)).toThrow("There isn't any scratch pad at")
    },
  )

  it('throws InvalidPathError when a part of the path is not valid percent encoding', () => {
    const request = () => get(homeWithExportJob(), '/api/scratch-pads/%E0%A4%A/pages')

    expect(request).toThrow(InvalidPathError)
    expect(request).toThrow('The path contains "%E0%A4%A", which isn\'t a valid URL part.')
  })

  it('saves nothing when Nick comments on a scratch pad that does not exist', () => {
    const home = homeWithExportJob()
    const request = () =>
      post(home, '/api/scratch-pads/2026-03-14-unknown/threads', { type: 'comment' })

    expect(request).toThrow(UnknownScratchPadError)
    expect(jsonBody(get(home, `${padApi}/pages/index.md/threads`))).toStrictEqual({ threads: [] })
  })
})
