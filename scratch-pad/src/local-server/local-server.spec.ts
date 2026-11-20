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
import { getFrom, postTo, startedServer } from './local-server-fixtures'
import { portOf, serveScratchPads, ServerListenError } from './local-server'

const padApi = `/api/scratch-pads/${exportJobPadName}`
const comment = JSON.stringify({
  type: 'comment',
  page: 'pages/index.md',
  ...retryAnchor,
  message: 'Is 5 retries enough?',
})

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

  it('returns 400 with the error when the body of a write is invalid', async () => {
    const server = await startedServer(homeWithExportJob())

    await expect(postTo(server, `${padApi}/threads`, 'retry=5')).resolves.toMatchObject({
      status: 400,
      body: `{"error":"The body of the request is invalid: it isn't JSON."}`,
    })
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

  it('throws ServerListenError when another server listens on the port', async () => {
    const home = homeWithExportJob()
    const server = await startedServer(home)
    const second = serveScratchPads({
      home,
      port: server.port,
      checkMilliseconds: 10,
      log: () => undefined,
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
