import { get as httpGet, type OutgoingHttpHeaders } from 'node:http'
import { afterEach, expect, vi } from 'vitest'
import { requestLocalServer, type LocalResponse } from './local-request'
import { serveScratchPads, type LocalServer } from './local-server'

const servers: LocalServer[] = []
const closers: Array<() => void> = []

const checkMilliseconds = 10

export const fakeBrowserPageBundle = {
  script: 'document.title = "export job"',
  stylesheet: 'body { margin: 0 }',
}

afterEach(async () => {
  closers.splice(0).forEach((close) => close())
  await Promise.all(servers.splice(0).map((server) => server.close()))
})

export async function startedServer(
  home: string,
  log: (text: string) => void = vi.fn<(text: string) => void>(),
): Promise<LocalServer> {
  const server = await serveScratchPads({
    home,
    port: 0,
    checkMilliseconds,
    log,
    browserPageBundle: fakeBrowserPageBundle,
  })
  servers.push(server)
  return server
}

export function getFrom(
  server: LocalServer,
  path: string,
  headers: OutgoingHttpHeaders = {},
): Promise<LocalResponse> {
  return requestLocalServer(server.port, {
    method: 'GET',
    path,
    headers,
    body: '',
    timeoutMilliseconds: 2000,
  })
}

export function postTo(
  server: LocalServer,
  path: string,
  body: string,
  headers: OutgoingHttpHeaders = {},
): Promise<LocalResponse> {
  return requestLocalServer(server.port, {
    method: 'POST',
    path,
    headers: { 'content-type': 'application/json', ...headers },
    body,
    timeoutMilliseconds: 2000,
  })
}

interface ChangeReader {
  readonly nextChange: () => Promise<unknown>
  readonly receivedChanges: () => readonly unknown[]
  readonly close: () => void
}

async function changeArrived(changes: () => unknown[], index: number): Promise<void> {
  await vi.waitFor(() => expect(changes().length).toBeGreaterThan(index), {
    timeout: 3000,
    interval: 5,
  })
}

export function openChanges(server: LocalServer, path: string): Promise<ChangeReader> {
  return new Promise((resolve, reject) => {
    const received = { text: '', read: 0 }
    const changes = (): unknown[] =>
      received.text
        .split('\n')
        .filter((line) => line.startsWith('data: '))
        .map((line): unknown => JSON.parse(line.slice('data: '.length)))
    const request = httpGet(
      { host: '127.0.0.1', port: server.port, path, agent: false },
      (response) => {
        response.setEncoding('utf8')
        response.on('data', (chunk: string) => {
          received.text += chunk
        })
        const close = (): void => {
          request.destroy()
        }
        closers.push(close)
        resolve({
          nextChange: async () => {
            const index = received.read
            await changeArrived(changes, index)
            received.read += 1
            return changes()[index]
          },
          receivedChanges: changes,
          close,
        })
      },
    )
    request.on('error', reject)
  })
}
