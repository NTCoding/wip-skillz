import { once } from 'node:events'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { type AddressInfo } from 'node:net'
import { inspect } from 'node:util'
import { UnknownPageError } from '../pages/page-markdown'
import { ScratchPadError } from '../scratch-pad-error'
import {
  BrokenPadDbError,
  BusyPadDbError,
  MissingPadDbError,
  NewerPadDbError,
  PadDbFailureError,
} from '../scratch-pad-folder/pad-db-errors'
import { UnknownDecisionError } from '../scratch-pad-folder/stored-decision-answers'
import { UnknownThreadError } from '../scratch-pad-folder/stored-threads'
import { UnknownScratchPadError } from '../scratch-pads-home/scratch-pads-home'
import { browserPageJson, browserPagePolicy } from './browser-page'
import { type BrowserPageBundle } from './browser-page-bundle'
import { htmlBlockFrameDocument } from '../browser-page/design-system/html-block-frame-document'
import { htmlBlockFramePolicy } from './html-block-frame'
import { PadChangeStreams } from './pad-change-stream'
import { refusalOf } from './same-machine-request'
import {
  respondToApiRequest,
  UnknownDecisionBlockError,
  UnknownRouteError,
  type ApiResponse,
} from './scratch-pad-api'

interface LocalServerOptions {
  readonly home: string
  readonly port: number
  readonly checkMilliseconds: number
  readonly log: (text: string) => void
  readonly browserPageBundle: BrowserPageBundle
}

export interface LocalServer {
  readonly port: number
  readonly close: () => Promise<void>
}

export class ServerListenError extends ScratchPadError {
  constructor(port: number, error: unknown) {
    super(
      `The server can't listen on 127.0.0.1:${port} (${String(error)}). Pick another port with --port <port>.`,
    )
  }
}

class RequestBodyTooLargeError extends ScratchPadError {
  constructor(largestBytes: number) {
    super(`The body of the request is larger than ${largestBytes} bytes.`)
  }
}

const largestBodyBytes = 1_000_000

const notFoundErrors = [
  UnknownRouteError,
  UnknownScratchPadError,
  UnknownPageError,
  UnknownThreadError,
  UnknownDecisionError,
  UnknownDecisionBlockError,
]

const padDbErrors = [
  BrokenPadDbError,
  BusyPadDbError,
  MissingPadDbError,
  NewerPadDbError,
  PadDbFailureError,
]

export async function serveScratchPads(options: LocalServerOptions): Promise<LocalServer> {
  const streams = new PadChangeStreams(options)
  const server = createServer((request, response) => {
    void respond(request, response, { options, streams, port: listeningPort() })
  })
  const listeningPort = (): number => portOf(server.address())
  server.listen(options.port, '127.0.0.1')
  try {
    await once(server, 'listening')
  } catch (error) {
    throw new ServerListenError(options.port, error)
  }
  return {
    port: listeningPort(),
    close: async () => {
      streams.close()
      server.closeAllConnections()
      server.close()
      await once(server, 'close')
    },
  }
}

interface RespondContext {
  readonly options: LocalServerOptions
  readonly streams: PadChangeStreams
  readonly port: number
}

async function respond(
  request: IncomingMessage,
  response: ServerResponse,
  context: RespondContext,
): Promise<void> {
  try {
    const method = String(request.method)
    const refusal = refusalOf(
      { method, host: request.headers.host, origin: request.headers.origin },
      context.port,
    )
    if (refusal !== undefined) {
      send(response, { kind: 'json', status: 403, body: { error: refusal } }, context)
      return
    }
    const body = method === 'POST' ? await bodyText(request, largestBodyBytes) : ''
    send(
      response,
      respondToApiRequest({ home: context.options.home, method, path: String(request.url), body }),
      context,
    )
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      response.setHeader('connection', 'close')
    }
    send(response, errorResponse(error, context.options.log), context)
  }
}

function bodyText(request: IncomingMessage, largestBytes: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    const received = { bytes: 0 }
    request.on('data', (chunk: Buffer) => {
      received.bytes += chunk.length
      if (received.bytes > largestBytes) {
        reject(new RequestBodyTooLargeError(largestBytes))
        return
      }
      chunks.push(chunk)
    })
    request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    request.on('error', reject)
  })
}

function send(response: ServerResponse, apiResponse: ApiResponse, context: RespondContext): void {
  const noStore = { 'cache-control': 'no-store' }
  if (apiResponse.kind === 'changes') {
    context.streams.open(apiResponse.folder, response)
    return
  }
  if (apiResponse.kind === 'browser-page-bundle') {
    const { script, stylesheet } = context.options.browserPageBundle
    const asScript = apiResponse.part === 'script'
    response
      .writeHead(200, {
        ...noStore,
        'content-type': asScript ? 'text/javascript; charset=utf-8' : 'text/css; charset=utf-8',
      })
      .end(asScript ? script : stylesheet)
    return
  }
  if (apiResponse.kind === 'html-block-frame') {
    response
      .writeHead(200, {
        ...noStore,
        'content-type': 'text/html; charset=utf-8',
        'content-security-policy': htmlBlockFramePolicy,
      })
      .end(htmlBlockFrameDocument)
    return
  }
  if (apiResponse.kind === 'redirect') {
    response.writeHead(308, { ...noStore, location: apiResponse.location }).end()
    return
  }
  if (apiResponse.kind === 'html') {
    response
      .writeHead(200, {
        ...noStore,
        'content-type': 'text/html; charset=utf-8',
        'content-security-policy': browserPagePolicy,
        'x-frame-options': 'DENY',
      })
      .end(apiResponse.html)
    return
  }
  response
    .writeHead(apiResponse.status, {
      ...noStore,
      'content-type': 'application/json; charset=utf-8',
    })
    .end(browserPageJson(apiResponse.body))
}

export function portOf(address: AddressInfo | string | null): number {
  return typeof address === 'object' && address !== null ? address.port : 0
}

function errorResponse(error: unknown, log: (text: string) => void): ApiResponse {
  if (error instanceof ScratchPadError) {
    return { kind: 'json', status: statusOf(error), body: { error: error.message } }
  }
  log(`The server failed: ${inspect(error)}`)
  return { kind: 'json', status: 500, body: { error: `The server failed: ${String(error)}` } }
}

function statusOf(error: ScratchPadError): number {
  if (error instanceof RequestBodyTooLargeError) {
    return 413
  }
  if (notFoundErrors.some((errorClass) => error instanceof errorClass)) {
    return 404
  }
  return padDbErrors.some((errorClass) => error instanceof errorClass) ? 500 : 400
}
