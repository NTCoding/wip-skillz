interface RequestHeaders {
  readonly method: string
  readonly host: string | undefined
  readonly origin: string | undefined
}

const readMethods: readonly string[] = ['GET', 'HEAD']

export function refusalOf(request: RequestHeaders, port: number): string | undefined {
  const ownHosts = [`localhost:${port}`, `127.0.0.1:${port}`]
  if (request.host === undefined || !ownHosts.includes(request.host)) {
    return `The server only accepts requests to localhost:${port} or 127.0.0.1:${port}.`
  }
  const ownOrigins = ownHosts.map((host) => `http://${host}`)
  if (
    !readMethods.includes(request.method) &&
    request.origin !== undefined &&
    !ownOrigins.includes(request.origin)
  ) {
    return `The server only accepts changes from its own pages at http://127.0.0.1:${port}.`
  }
  return undefined
}
