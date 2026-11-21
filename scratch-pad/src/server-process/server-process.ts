import { spawn, type ChildProcess } from 'node:child_process'
import { closeSync, mkdirSync, openSync, readFileSync } from 'node:fs'
import { setTimeout as sleep } from 'node:timers/promises'
import { requestLocalServer } from '../local-server/local-request'
import { browserPageBundle } from '../local-server/browser-page-bundle'
import { serveScratchPads } from '../local-server/local-server'
import { jsonObjectFrom } from '../local-server/request-body'
import { ScratchPadError } from '../scratch-pad-error'
import { type Environment } from '../scratch-pads-home/scratch-pads-home'
import {
  readServerFile,
  removeServerFile,
  serverLogPath,
  writeServerFile,
  type ServerFile,
} from './server-file'
import { ServerLock } from './server-lock'

export type ToolCommand = readonly [string, ...string[]]

export interface ServerStart {
  readonly home: string
  readonly port: number
  readonly build: string
  readonly toolCommand: ToolCommand
  readonly environment: Environment
  readonly startMilliseconds: number
  readonly stopMilliseconds: number
}

export interface StartedServer {
  readonly port: number
  readonly how: 'started' | 'already-running' | 'replaced'
}

interface RunningServer {
  readonly pid: number
  readonly port: number
  readonly build: string | undefined
}

interface ServerIdentity {
  readonly pid: number
  readonly build: string | undefined
}

interface ServerInThisProcess {
  readonly home: string
  readonly port: number
  readonly checkMilliseconds: number
  readonly otherServerMilliseconds: number
  readonly stopSignal: AbortSignal
  readonly log: (text: string) => void
}

const checkServerMilliseconds = 50
const askServerMilliseconds = 1000

export class ServerExitedError extends ScratchPadError {
  constructor(log: string) {
    super(`The server didn't start. ${lastLineOf(log)}`)
  }
}

export class ServerStartTimeoutError extends ScratchPadError {
  constructor(log: string, milliseconds: number) {
    super(`The server didn't start within ${milliseconds / 1000} seconds. Read ${log} to see why.`)
  }
}

export class ServerAlreadyRunningError extends ScratchPadError {
  constructor(home: string, port: number | undefined) {
    super(
      port === undefined
        ? `Another server for ${home} is still starting. Run the command again in a few seconds.`
        : `A server for ${home} is already running on port ${port}. Stop it with: scratch-pad stop`,
    )
  }
}

export class ServerStopTimeoutError extends ScratchPadError {
  constructor(pid: number, milliseconds: number) {
    super(`The server didn't stop within ${milliseconds / 1000} seconds. Stop it with: kill ${pid}`)
  }
}

export async function startServerProcess(start: ServerStart): Promise<StartedServer> {
  const running = await runningServer(start.home)
  if (running?.build === start.build) {
    return { port: running.port, how: 'already-running' }
  }
  if (running !== undefined) {
    await stopServerProcess(start.home, start.stopMilliseconds)
  }
  mkdirSync(start.home, { recursive: true })
  const log = openSync(serverLogPath(start.home), 'a')
  const [command, ...words] = start.toolCommand
  const port = running?.port ?? start.port
  const child = spawn(command, [...words, 'serve', '--port', String(port)], {
    detached: true,
    stdio: ['ignore', log, log],
    cwd: start.home,
    env: { ...start.environment, SCRATCH_PADS_HOME: start.home },
  })
  closeSync(log)
  child.unref()
  return serverOnceStarted(child, start, running === undefined ? 'started' : 'replaced')
}

export async function stopServerProcess(
  home: string,
  stopMilliseconds: number,
): Promise<number | undefined> {
  const saved = readServerFile(home)
  if (saved === undefined) {
    return undefined
  }
  const running = await serverInFile(saved, home)
  if (running !== undefined) {
    process.kill(running.pid, 'SIGTERM')
    await processEnded(running.pid, stopMilliseconds)
  }
  removeServerFile(home, saved.pid)
  return running?.port
}

export async function serveInThisProcess(serve: ServerInThisProcess): Promise<number> {
  const lock = ServerLock.claim(serve.home)
  if (lock === undefined) {
    const other = await serverOnceListening(serve)
    throw new ServerAlreadyRunningError(serve.home, other?.port)
  }
  const server = await serveScratchPads({ ...serve, browserPageBundle }).catch((error: unknown) => {
    lock.release()
    throw error
  })
  writeServerFile(serve.home, { pid: process.pid, port: server.port })
  const stop = (): void => {
    removeServerFile(serve.home, process.pid)
    void server.close().finally(() => lock.release())
  }
  if (serve.stopSignal.aborted) {
    stop()
  } else {
    serve.stopSignal.addEventListener('abort', stop, { once: true })
  }
  return server.port
}

export async function processEnded(pid: number, stopMilliseconds: number): Promise<void> {
  const deadline = Date.now() + stopMilliseconds
  while (isRunning(pid)) {
    if (Date.now() >= deadline) {
      throw new ServerStopTimeoutError(pid, stopMilliseconds)
    }
    await sleep(checkServerMilliseconds)
  }
}

export function serverIdentityOf(identity: unknown, home: string): ServerIdentity | undefined {
  const server = jsonObjectFrom(identity)
  const pid = server?.['pid']
  const build = server?.['build']
  return server?.['home'] === home && typeof pid === 'number'
    ? { pid, build: typeof build === 'string' ? build : undefined }
    : undefined
}

export async function runningServer(home: string): Promise<RunningServer | undefined> {
  const saved = readServerFile(home)
  return saved === undefined ? undefined : serverInFile(saved, home)
}

async function serverInFile(saved: ServerFile, home: string): Promise<RunningServer | undefined> {
  const identity = await askServerForIdentity(saved.port, home)
  return identity === undefined ? undefined : { ...identity, port: saved.port }
}

async function serverOnceListening(serve: ServerInThisProcess): Promise<RunningServer | undefined> {
  const deadline = Date.now() + serve.otherServerMilliseconds
  for (;;) {
    const running = await runningServer(serve.home)
    if (running !== undefined || Date.now() >= deadline) {
      return running
    }
    await sleep(serve.checkMilliseconds)
  }
}

async function askServerForIdentity(
  port: number,
  home: string,
): Promise<ServerIdentity | undefined> {
  try {
    const response = await requestLocalServer(port, {
      method: 'GET',
      path: '/api/server',
      headers: {},
      body: '',
      timeoutMilliseconds: askServerMilliseconds,
    })
    return serverIdentityOf(JSON.parse(response.body), home)
  } catch {
    return undefined
  }
}

async function serverOnceStarted(
  child: ChildProcess,
  start: ServerStart,
  how: 'started' | 'replaced',
): Promise<StartedServer> {
  const deadline = Date.now() + start.startMilliseconds
  while (Date.now() < deadline) {
    const exited = child.exitCode !== null
    const running = await runningServer(start.home)
    if (running !== undefined) {
      return { port: running.port, how: running.pid === child.pid ? how : 'already-running' }
    }
    if (exited) {
      throw new ServerExitedError(serverLogPath(start.home))
    }
    await sleep(checkServerMilliseconds)
  }
  child.kill()
  throw new ServerStartTimeoutError(serverLogPath(start.home), start.startMilliseconds)
}

function isRunning(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

function lastLineOf(log: string): string {
  const last = readFileSync(log, 'utf8')
    .split('\n')
    .filter((line) => line.trim() !== '')
    .at(-1)
  return last === undefined ? `${log} is empty.` : `The last line of ${log} is: ${last}`
}
