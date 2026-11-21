import { type StartedServer } from './server-process'

export function serverAddress(port: number, padName: string | undefined): string {
  const pad = padName === undefined ? '' : `${encodeURIComponent(padName)}/`
  return `http://127.0.0.1:${port}/${pad}`
}

const startedTexts: Readonly<Record<StartedServer['how'], string>> = {
  started: 'started the server',
  'already-running': 'the server is already running',
  replaced: 'restarted the server with this version of scratch-pad',
}

export function startedServerText(started: StartedServer, padName: string | undefined): string {
  return `${startedTexts[started.how]}: ${serverAddress(started.port, padName)}`
}

export function stoppedServerText(port: number | undefined): string {
  return port === undefined
    ? "the server isn't running"
    : `stopped the server on ${serverAddress(port, undefined)}`
}

export function servingText(home: string, port: number): string {
  return `serving the scratch pads in ${home} on ${serverAddress(port, undefined)}`
}
