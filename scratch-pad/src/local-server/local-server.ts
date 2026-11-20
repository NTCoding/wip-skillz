import { once } from 'node:events'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { type AddressInfo } from 'node:net'
import { text } from 'node:stream/consumers'
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
    const body = method === 'POST' ? await text(request) : ''
    send(
      response,
      respondToApiRequest({ home: context.options.home, method, path: String(request.url), body }),
      context,
    )
  } catch (error) {
    send(response, errorResponse(error, context.options.log), context)
  }
}

function send(response: ServerResponse, apiResponse: ApiResponse, context: RespondContext): void {
  const noStore = { 'cache-control': 'no-store' }
  if (apiResponse.kind === 'changes') {
    context.streams.open(apiResponse.folder, response)
    return
  }
  if (apiResponse.kind === 'redirect') {
    response.writeHead(308, { ...noStore, location: apiResponse.location }).end()
    return
  }
  if (apiResponse.kind === 'html') {
    response
      .writeHead(200, { ...noStore, 'content-type': 'text/html; charset=utf-8' })
      .end(apiResponse.html)
    return
  }
  response
    .writeHead(apiResponse.status, {
      ...noStore,
      'content-type': 'application/json; charset=utf-8',
    })
    .end(JSON.stringify(apiResponse.body, (_key, value: unknown) => value ?? null))
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
  if (notFoundErrors.some((errorClass) => error instanceof errorClass)) {
    return 404
  }
  return padDbErrors.some((errorClass) => error instanceof errorClass) ? 500 : 400
}
