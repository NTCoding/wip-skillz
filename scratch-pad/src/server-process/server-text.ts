import { type StartedServer } from './server-process'

export function serverAddress(port: number, padName: string | undefined): string {
  const pad = padName === undefined ? '' : `${encodeURIComponent(padName)}/`
  return `http://localhost:${port}/${pad}`
}

export function startedServerText(started: StartedServer, padName: string | undefined): string {
  const address = serverAddress(started.port, padName)
  return started.wasRunning
    ? `the server is already running: ${address}`
    : `started the server: ${address}`
}

export function stoppedServerText(port: number | undefined): string {
  return port === undefined
    ? "the server isn't running"
    : `stopped the server on ${serverAddress(port, undefined)}`
}

export function servingText(home: string, port: number): string {
  return `serving the scratch pads in ${home} on ${serverAddress(port, undefined)}`
}
