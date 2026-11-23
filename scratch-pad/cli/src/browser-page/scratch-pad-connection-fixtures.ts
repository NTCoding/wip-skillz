import { type BrowserNetwork } from './scratch-pad-connection'

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status })
}

export function networkReturning(response: Response): BrowserNetwork & {
  readonly fetched: string[]
} {
  const fetched: string[] = []
  return {
    fetched,
    fetch: (url) => {
      fetched.push(url)
      return Promise.resolve(response)
    },
    openChangeStream: () => ({ addEventListener: () => undefined, close: () => undefined }),
  }
}

interface SentRequest {
  readonly url: string
  readonly method: string | undefined
  readonly body: string | undefined
}

export function networkWith(body: unknown): BrowserNetwork & { readonly sent: SentRequest[] } {
  const sent: SentRequest[] = []
  return {
    sent,
    fetch: (url, request) => {
      sent.push({ url, method: request?.method, body: request?.body })
      return Promise.resolve(jsonResponse(body))
    },
    openChangeStream: () => ({ addEventListener: () => undefined, close: () => undefined }),
  }
}
