import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { requestLocalServer } from '../local-server/local-request'
import { startedServer } from '../local-server/local-server-fixtures'
import {
  exportJobPadName,
  exportJobScratchPad,
  removeTemporaryHomes,
  temporaryHome,
} from '../scratch-pad-folder/scratch-pad-folder-fixtures'
import { readServerFile, serverLogPath, writeServerFile } from './server-file'
import { builtTool, homeForServer, stopServers } from './server-process-fixtures'
import {
  pidOfServer,
  processEnded,
  serveInThisProcess,
  ServerExitedError,
  ServerStartTimeoutError,
  ServerStopTimeoutError,
  startServerProcess,
  stopServerProcess,
  type ServerStart,
} from './server-process'

const toolCommand = builtTool()

afterEach(async () => {
  await stopServers()
  removeTemporaryHomes()
})

function serverStart(home: string, changes: Partial<ServerStart> = {}): ServerStart {
  return {
    home,
    port: 0,
    toolCommand: toolCommand(),
    environment: {},
    startMilliseconds: 5000,
    ...changes,
  }
}

function scratchPadsOf(port: number): Promise<string> {
  return requestLocalServer(port, {
    method: 'GET',
    path: '/api/scratch-pads',
    headers: {},
    body: '',
    timeoutMilliseconds: 2000,
  }).then((response) => response.body)
}

describe('startServerProcess', () => {
  it('starts a server process that serves the scratch pads of the home folder', async () => {
    const home = homeForServer()
    exportJobScratchPad(home)

    const started = await startServerProcess(serverStart(home))

    await expect(scratchPadsOf(started.port)).resolves.toBe(
      `{"scratchPads":["${exportJobPadName}"]}`,
    )
  })

  it('returns the running server when a server already runs for the home folder', async () => {
    const home = homeForServer()
    const first = await startServerProcess(serverStart(home))

    await expect(startServerProcess(serverStart(home, { port: 4747 }))).resolves.toStrictEqual({
      port: first.port,
      wasRunning: true,
    })
  })

  it('throws ServerExitedError when the server process ends before it serves anything', async () => {
    const home = homeForServer()
    const start = startServerProcess(
      serverStart(home, { toolCommand: [process.execPath, '--eval', 'process.exit(3)'] }),
    )

    await expect(start).rejects.toThrow(ServerExitedError)
    await expect(start).rejects.toThrow(`The server didn't start. ${serverLogPath(home)} is empty.`)
  })

  it('throws ServerExitedError with the last line of the log when the port is in use', async () => {
    const home = homeForServer()
    const other = await startedServer(temporaryHome())
    const start = startServerProcess(serverStart(home, { port: other.port }))

    await expect(start).rejects.toThrow(ServerExitedError)
    await expect(start).rejects.toThrow(
      `The server didn't start. The last line of ${serverLogPath(home)} is: The server can't listen on 127.0.0.1:${other.port}`,
    )
  })

  it('throws ServerStartTimeoutError when the server process never serves anything', async () => {
    const home = homeForServer()
    const start = startServerProcess(
      serverStart(home, {
        toolCommand: [process.execPath, '--eval', 'setTimeout(() => undefined, 5000)'],
        startMilliseconds: 200,
      }),
    )

    await expect(start).rejects.toThrow(ServerStartTimeoutError)
    await expect(start).rejects.toThrow(
      `The server didn't start within 0.2 seconds. Read ${serverLogPath(home)} to see why.`,
    )
  })
})

describe('stopServerProcess', () => {
  it('stops the server process and removes the server file when the server runs', async () => {
    const home = homeForServer()
    const started = await startServerProcess(serverStart(home))
    const pid = readServerFile(home)?.pid

    await expect(stopServerProcess(home, 5000)).resolves.toBe(started.port)
    expect(existsSync(join(home, '.scratch-pad-server.json'))).toBe(false)
    expect(() => process.kill(Number(pid), 0)).toThrow('kill ESRCH')
  })

  it('returns undefined and removes the server file when the server in the file has stopped', async () => {
    const home = temporaryHome()
    const stopped = await startedServer(home)
    writeServerFile(home, { pid: 4321, port: stopped.port })
    await stopped.close()

    await expect(stopServerProcess(home, 5000)).resolves.toBeUndefined()
    expect(readServerFile(home)).toBeUndefined()
  })

  it('returns undefined when there is no server file', async () => {
    await expect(stopServerProcess(temporaryHome(), 5000)).resolves.toBeUndefined()
  })
})

describe('processEnded', () => {
  it('throws ServerStopTimeoutError when the process is still running after the time is up', async () => {
    const ended = processEnded(process.pid, 100)

    await expect(ended).rejects.toThrow(ServerStopTimeoutError)
    await expect(ended).rejects.toThrow(
      `The server didn't stop within 0.1 seconds. Stop it with: kill ${process.pid}`,
    )
  })
})

describe('pidOfServer', () => {
  it('returns the pid when the server serves the home folder', () => {
    expect(pidOfServer({ home: '/pads', pid: 4321 }, '/pads')).toBe(4321)
  })

  it.each([{ home: '/other-pads', pid: 4321 }, { home: '/pads', pid: '4321' }, 'busy', null])(
    'returns undefined when the server answers %j',
    (identity) => {
      expect(pidOfServer(identity, '/pads')).toBeUndefined()
    },
  )
})

describe('serveInThisProcess', () => {
  const stopping = { controller: new AbortController() }

  afterEach(() => {
    stopping.controller.abort()
    stopping.controller = new AbortController()
  })

  function serve(home: string): Promise<number> {
    return serveInThisProcess({
      home,
      port: 0,
      checkMilliseconds: 10,
      stopSignal: stopping.controller.signal,
      log: () => undefined,
    })
  }

  it('writes the server file with this process and the port when the server listens', async () => {
    const home = temporaryHome()

    const port = await serve(home)

    expect(readServerFile(home)).toStrictEqual({ pid: process.pid, port })
  })

  it('removes the server file and closes the server when the stop signal is aborted', async () => {
    const home = temporaryHome()
    const port = await serve(home)

    stopping.controller.abort()

    expect(readServerFile(home)).toBeUndefined()
    await vi.waitFor(() => expect(scratchPadsOf(port)).rejects.toThrow('ECONNREFUSED'))
  })
})
