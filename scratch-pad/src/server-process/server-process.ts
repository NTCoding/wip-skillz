import { spawn, type ChildProcess } from 'node:child_process'
import { closeSync, mkdirSync, openSync, readFileSync } from 'node:fs'
import { setTimeout as sleep } from 'node:timers/promises'
import { requestLocalServer } from '../local-server/local-request'
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

export type ToolCommand = readonly [string, ...string[]]

export interface ServerStart {
  readonly home: string
  readonly port: number
  readonly toolCommand: ToolCommand
  readonly environment: Environment
  readonly startMilliseconds: number
}

export interface StartedServer {
  readonly port: number
  readonly wasRunning: boolean
}

interface ServerInThisProcess {
  readonly home: string
  readonly port: number
  readonly checkMilliseconds: number
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

export class ServerStopTimeoutError extends ScratchPadError {
  constructor(pid: number, milliseconds: number) {
    super(`The server didn't stop within ${milliseconds / 1000} seconds. Stop it with: kill ${pid}`)
  }
}

export async function startServerProcess(start: ServerStart): Promise<StartedServer> {
  const running = await runningServer(start.home)
  if (running !== undefined) {
    return { port: running.port, wasRunning: true }
  }
  mkdirSync(start.home, { recursive: true })
  const log = openSync(serverLogPath(start.home), 'a')
  const [command, ...words] = start.toolCommand
  const child = spawn(command, [...words, 'serve', '--port', String(start.port)], {
    detached: true,
    stdio: ['ignore', log, log],
    cwd: start.home,
    env: { ...start.environment, SCRATCH_PADS_HOME: start.home },
  })
  closeSync(log)
  child.unref()
  return { port: await portOnceStarted(child, start), wasRunning: false }
}

export async function stopServerProcess(
  home: string,
  stopMilliseconds: number,
): Promise<number | undefined> {
  const running = await runningServer(home)
  if (running !== undefined) {
    process.kill(running.pid, 'SIGTERM')
    await processEnded(running.pid, stopMilliseconds)
  }
  removeServerFile(home)
  return running?.port
}

export async function serveInThisProcess(serve: ServerInThisProcess): Promise<number> {
  const server = await serveScratchPads(serve)
  writeServerFile(serve.home, { pid: process.pid, port: server.port })
  serve.stopSignal.addEventListener(
    'abort',
    () => {
      removeServerFile(serve.home)
      void server.close()
    },
    { once: true },
  )
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

export function pidOfServer(identity: unknown, home: string): number | undefined {
  const server = jsonObjectFrom(identity)
  const pid = server?.['pid']
  return server?.['home'] === home && typeof pid === 'number' ? pid : undefined
}

async function runningServer(home: string): Promise<ServerFile | undefined> {
  const saved = readServerFile(home)
  if (saved === undefined) {
    return undefined
  }
  const pid = await askServerForPid(saved.port, home)
  return pid === undefined ? undefined : { pid, port: saved.port }
}

async function askServerForPid(port: number, home: string): Promise<number | undefined> {
  try {
    const response = await requestLocalServer(port, {
      method: 'GET',
      path: '/api/server',
      headers: {},
      body: '',
      timeoutMilliseconds: askServerMilliseconds,
    })
    return pidOfServer(JSON.parse(response.body), home)
  } catch {
    return undefined
  }
}

async function portOnceStarted(child: ChildProcess, start: ServerStart): Promise<number> {
  const deadline = Date.now() + start.startMilliseconds
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new ServerExitedError(serverLogPath(start.home))
    }
    const running = await runningServer(start.home)
    if (running !== undefined && running.pid === child.pid) {
      return running.port
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
