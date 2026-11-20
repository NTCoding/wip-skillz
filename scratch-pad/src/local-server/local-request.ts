import { request as httpRequest, type OutgoingHttpHeaders } from 'node:http'
import { text } from 'node:stream/consumers'

interface LocalRequest {
  readonly method: string
  readonly path: string
  readonly headers: OutgoingHttpHeaders
  readonly body: string
  readonly timeoutMilliseconds: number
}

export interface LocalResponse {
  readonly status: number
  readonly contentType: string
  readonly location: string
  readonly body: string
}

export function requestLocalServer(port: number, request: LocalRequest): Promise<LocalResponse> {
  return new Promise((resolve, reject) => {
    const outgoing = httpRequest(
      {
        host: '127.0.0.1',
        port,
        method: request.method,
        path: request.path,
        headers: request.headers,
        agent: false,
        signal: AbortSignal.timeout(request.timeoutMilliseconds),
      },
      (response) => {
        text(response).then(
          (body) =>
            resolve({
              status: Number(response.statusCode),
              contentType: String(response.headers['content-type']),
              location: String(response.headers.location),
              body,
            }),
          reject,
        )
      },
    )
    outgoing.on('error', reject)
    outgoing.end(request.body)
  })
}
