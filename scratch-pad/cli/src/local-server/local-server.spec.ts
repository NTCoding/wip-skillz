import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  exportJobPadName,
  exportJobScratchPad,
  removeTemporaryHomes,
  temporaryHome,
} from '../scratch-pad-folder/scratch-pad-folder-fixtures'
import { retryAnchor } from '../threads/thread-fixtures'
import { browserPagePolicy } from './browser-page'
import { htmlBlockFrameDocument } from '../browser-page/design-system/html-block-frame-document'
import { htmlBlockFramePath, htmlBlockFramePolicy } from './html-block-frame'
import { fakeBrowserPageBundle, getFrom, postTo, startedServer } from './local-server-fixtures'
import { portOf, serveScratchPads, ServerListenError } from './local-server'

const padApi = `/api/scratch-pads/${exportJobPadName}`
const commentFields = {
  type: 'comment',
  page: 'pages/index.md',
  ...retryAnchor,
  message: 'Is 5 retries enough?',
}
const comment = JSON.stringify(commentFields)

afterEach(() => {
  removeTemporaryHomes()
})

function homeWithExportJob(): string {
  const home = temporaryHome()
  exportJobScratchPad(home)
  return home
}

describe('serveScratchPads', () => {
  it('returns JSON with null for each missing value when the progress tracker is asked for', async () => {
    const server = await startedServer(homeWithExportJob())

    await expect(getFrom(server, `${padApi}/progress-tracker`)).resolves.toMatchObject({
      status: 200,
      contentType: 'application/json; charset=utf-8',
      body: '{"title":"Export job","goal":null,"tasks":[]}',
    })
  })

  it('returns 201 when a program on the same machine posts a comment without an origin', async () => {
    const server = await startedServer(homeWithExportJob())

    await expect(postTo(server, `${padApi}/threads`, comment)).resolves.toMatchObject({
      status: 201,
    })
  })

  it('returns 403 when the host is another name for the server', async () => {
    const server = await startedServer(homeWithExportJob())

    await expect(
      getFrom(server, `${padApi}/pages`, { host: `scratch-pad.example.com:${server.port}` }),
    ).resolves.toMatchObject({
      status: 403,
      body: `{"error":"The server only accepts requests to localhost:${server.port} or 127.0.0.1:${server.port}."}`,
    })
  })

  it('saves nothing when another site posts a comment', async () => {
    const server = await startedServer(homeWithExportJob())

    const response = await postTo(server, `${padApi}/threads`, comment, {
      origin: 'http://scratch-pad.example.com',
    })

    expect(response.status).toBe(403)
    await expect(getFrom(server, `${padApi}/pages/index.md/threads`)).resolves.toMatchObject({
      body: '{"threads":[]}',
    })
  })

  it('returns 404 with the error when the route does not exist', async () => {
    const server = await startedServer(homeWithExportJob())

    await expect(getFrom(server, '/api/retries')).resolves.toMatchObject({
      status: 404,
      body: `{"error":"There isn't any route for GET /api/retries."}`,
    })
  })

  it('returns 404 with the error when the improvement doesn’t exist', async () => {
    const server = await startedServer(homeWithExportJob())

    await expect(postTo(server, `${padApi}/improvements/3/delete`, '{}')).resolves.toMatchObject({
      status: 404,
      body: `{"error":"There isn't any improvement 3 because there aren't any improvements yet."}`,
    })
  })

  it('returns 400 with the error when the body of a write is invalid', async () => {
    const server = await startedServer(homeWithExportJob())

    await expect(postTo(server, `${padApi}/threads`, 'retry=5')).resolves.toMatchObject({
      status: 400,
      body: `{"error":"The body of the request is invalid: it isn't JSON."}`,
    })
  })

  it("returns 400 when the lines of a comment aren't in the page", async () => {
    const server = await startedServer(homeWithExportJob())
    const body = JSON.stringify({ ...commentFields, firstLine: 900, lastLine: 901 })

    await expect(postTo(server, `${padApi}/threads`, body)).resolves.toMatchObject({
      status: 400,
      body: `{"error":"Lines 900-901 aren't in pages/index.md, which has 6 lines. Reload the page and select the text again."}`,
    })
  })

  it('returns 400 when a reply is longer than 10,000 characters', async () => {
    const server = await startedServer(homeWithExportJob())
    const body = JSON.stringify({ message: 'a'.repeat(10_001) })

    await expect(postTo(server, `${padApi}/threads/c-1/replies`, body)).resolves.toMatchObject({
      status: 400,
      body: `{"error":"The body of the request is invalid: \\"message\\" has 10001 characters, but a message can't be longer than 10000 characters."}`,
    })
  })

  it('returns 413 when the body of a write is larger than 1 MB', async () => {
    const server = await startedServer(homeWithExportJob())

    await expect(
      postTo(server, `${padApi}/threads/c-1/resolve`, 'a'.repeat(1_000_001)),
    ).resolves.toMatchObject({
      status: 413,
      body: '{"error":"The body of the request is larger than 1000000 bytes."}',
    })
  })

  it('reads the body of a write when the body is exactly 1 MB', async () => {
    const server = await startedServer(homeWithExportJob())

    await expect(postTo(server, `${padApi}/threads`, 'a'.repeat(1_000_000))).resolves.toMatchObject(
      { status: 400, body: `{"error":"The body of the request is invalid: it isn't JSON."}` },
    )
  })

  it('returns 500 when the scratch pad has no pad.db', async () => {
    const home = temporaryHome()
    mkdirSync(join(home, '2026-03-14-export-job', 'pages'), { recursive: true })
    const server = await startedServer(home)

    await expect(getFrom(server, `${padApi}/pages`)).resolves.toMatchObject({ status: 500 })
  })

  it('returns 500 and logs the error when a page file cannot be read', async () => {
    const home = homeWithExportJob()
    mkdirSync(join(home, exportJobPadName, 'pages', 'queue.md'))
    const log = vi.fn<(text: string) => void>()
    const server = await startedServer(home, log)

    const response = await getFrom(server, `${padApi}/pages/queue.md`)

    expect(response.status).toBe(500)
    expect(log).toHaveBeenCalledWith(expect.stringMatching(/^The server failed: Error: EISDIR/))
  })

  it('returns 308 with the address of the scratch pad when the address has no slash', async () => {
    const server = await startedServer(homeWithExportJob())

    await expect(getFrom(server, `/${exportJobPadName}`)).resolves.toMatchObject({
      status: 308,
      location: `/${exportJobPadName}/`,
    })
  })

  it('returns HTML when the browser asks for a page of the scratch pad', async () => {
    const server = await startedServer(homeWithExportJob())

    await expect(getFrom(server, `/${exportJobPadName}/`)).resolves.toMatchObject({
      status: 200,
      contentType: 'text/html; charset=utf-8',
    })
  })

  it('returns the script of the bundle as JavaScript when the browser asks for scratch-pad.js', async () => {
    const server = await startedServer(homeWithExportJob())

    await expect(getFrom(server, '/browser-page/scratch-pad.js')).resolves.toMatchObject({
      status: 200,
      contentType: 'text/javascript; charset=utf-8',
      body: fakeBrowserPageBundle.script,
    })
  })

  it('returns the stylesheet of the bundle as CSS when the browser asks for scratch-pad.css', async () => {
    const server = await startedServer(homeWithExportJob())

    await expect(getFrom(server, '/browser-page/scratch-pad.css')).resolves.toMatchObject({
      status: 200,
      contentType: 'text/css; charset=utf-8',
      body: fakeBrowserPageBundle.stylesheet,
    })
  })

  it('sends the policy of the page and forbids other sites to frame it when the browser asks for a page', async () => {
    const server = await startedServer(homeWithExportJob())

    await expect(getFrom(server, `/${exportJobPadName}/`)).resolves.toMatchObject({
      headers: {
        'content-security-policy': browserPagePolicy,
        'x-frame-options': 'DENY',
      },
    })
  })

  it('returns the frame of an html block with its own sandbox policy when the browser asks for it', async () => {
    const server = await startedServer(homeWithExportJob())

    await expect(getFrom(server, htmlBlockFramePath)).resolves.toMatchObject({
      status: 200,
      contentType: 'text/html; charset=utf-8',
      headers: { 'content-security-policy': htmlBlockFramePolicy },
      body: htmlBlockFrameDocument,
    })
  })

  it('sends a sandbox or forbids every frame in the policy of every HTML response, so an HTML response can’t open a way out of the sandbox', async () => {
    const server = await startedServer(homeWithExportJob())
    const pathOfEveryKindOfResponse = [
      '/',
      `/${exportJobPadName}`,
      `/${exportJobPadName}/`,
      `/${exportJobPadName}/index.md`,
      htmlBlockFramePath,
      '/browser-page/scratch-pad.js',
      '/browser-page/scratch-pad.css',
      '/api/server',
      `${padApi}/pages`,
      '/api/retries',
    ]
    const responses = await Promise.all(
      pathOfEveryKindOfResponse.map(async (path) => ({ path, ...(await getFrom(server, path)) })),
    )
    const htmlResponses = responses.filter((response) =>
      response.contentType.startsWith('text/html'),
    )
    const sandboxedOrNeverFramed = (policy: unknown): boolean => {
      const directives = String(policy)
        .split(';')
        .map((directive) => directive.trim())
      return (
        directives.some((directive) => /^sandbox(\s|$)/.test(directive)) ||
        directives.includes("frame-ancestors 'none'")
      )
    }

    expect(htmlResponses.map((response) => response.path)).toStrictEqual([
      '/',
      `/${exportJobPadName}/`,
      `/${exportJobPadName}/index.md`,
      htmlBlockFramePath,
    ])
    expect(
      htmlResponses
        .filter((response) => !sandboxedOrNeverFramed(response.headers['content-security-policy']))
        .map((response) => response.path),
    ).toStrictEqual([])
  })

  it('throws ServerListenError when another server listens on the port', async () => {
    const home = homeWithExportJob()
    const server = await startedServer(home)
    const second = serveScratchPads({
      home,
      port: server.port,
      checkMilliseconds: 10,
      log: () => undefined,
      browserPageBundle: fakeBrowserPageBundle,
    })

    await expect(second).rejects.toThrow(ServerListenError)
    await expect(second).rejects.toThrow(`The server can't listen on 127.0.0.1:${server.port}`)
  })
})

describe('portOf', () => {
  it.each(['scratch-pad.sock', null])('returns 0 when the address is %s', (address) => {
    expect(portOf(address)).toBe(0)
  })
})
