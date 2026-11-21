import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { requestLocalServer } from '../local-server/local-request'
import { ServerListenError } from '../local-server/local-server'
import { startedServer } from '../local-server/local-server-fixtures'
import {
  exportJobPadName,
  exportJobScratchPad,
  removeTemporaryHomes,
  temporaryHome,
} from '../scratch-pad-folder/scratch-pad-folder-fixtures'
import { toolBuild } from '../local-server/tool-build'
import { readServerFile, serverLogPath, writeServerFile } from './server-file'
import { ServerLock } from './server-lock'
import { builtTool, homeForServer, stopServers } from './server-process-fixtures'
import {
  processEnded,
  runningServer,
  serveInThisProcess,
  ServerAlreadyRunningError,
  ServerExitedError,
  ServerStartTimeoutError,
  ServerStopTimeoutError,
  serverIdentityOf,
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
    build: toolBuild,
    toolCommand: toolCommand(),
    environment: {},
    startMilliseconds: 5000,
    stopMilliseconds: 5000,
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

function identityOf(port: number): Promise<unknown> {
  return requestLocalServer(port, {
    method: 'GET',
    path: '/api/server',
    headers: {},
    body: '',
    timeoutMilliseconds: 2000,
  }).then((response): unknown => JSON.parse(response.body))
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
      how: 'already-running',
    })
  })

  it('replaces the running server on the same port when the running server is of another build', async () => {
    const home = homeForServer()
    const first = await startServerProcess(serverStart(home))
    const firstPid = readServerFile(home)?.pid

    await expect(
      startServerProcess(serverStart(home, { build: 'another build' })),
    ).resolves.toStrictEqual({ port: first.port, how: 'replaced' })
    expect(readServerFile(home)?.pid).not.toBe(firstPid)
  })

  it('stops the server of the other build when the running server is replaced', async () => {
    const home = homeForServer()
    await startServerProcess(serverStart(home))
    const firstPid = Number(readServerFile(home)?.pid)

    await startServerProcess(serverStart(home, { build: 'another build' }))

    expect(() => process.kill(firstPid, 0)).toThrow('kill ESRCH')
  })

  it('returns the same server to every start when several starts run at the same time', async () => {
    const home = homeForServer()

    const starts = await Promise.all([1, 2, 3].map(() => startServerProcess(serverStart(home))))

    expect(new Set(starts.map((started) => started.port)).size).toBe(1)
    expect(starts.filter((started) => started.how === 'started')).toHaveLength(1)
  })

  it('keeps the server file of the running server when several starts run at the same time', async () => {
    const home = homeForServer()

    const [first] = await Promise.all([1, 2, 3].map(() => startServerProcess(serverStart(home))))

    await expect(identityOf(Number(first?.port))).resolves.toStrictEqual({
      home,
      pid: readServerFile(home)?.pid,
      build: toolBuild,
    })
  })

  it('starts a new server when the server in the server file was killed', async () => {
    const home = homeForServer()
    await startServerProcess(serverStart(home))
    const killed = Number(readServerFile(home)?.pid)
    process.kill(killed, 'SIGKILL')
    await processEnded(killed, 5000)

    await expect(startServerProcess(serverStart(home))).resolves.toMatchObject({
      how: 'started',
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

describe('serverIdentityOf', () => {
  it('returns the pid and the build when the server serves the home folder', () => {
    expect(serverIdentityOf({ home: '/pads', pid: 4321, build: 'a1b2' }, '/pads')).toStrictEqual({
      pid: 4321,
      build: 'a1b2',
    })
  })

  it('returns an unknown build when the server is of a version without a build', () => {
    expect(serverIdentityOf({ home: '/pads', pid: 4321 }, '/pads')).toStrictEqual({
      pid: 4321,
      build: undefined,
    })
  })

  it.each([{ home: '/other-pads', pid: 4321 }, { home: '/pads', pid: '4321' }, 'busy', null])(
    'returns undefined when the server returns %j',
    (identity) => {
      expect(serverIdentityOf(identity, '/pads')).toBeUndefined()
    },
  )
})

describe('runningServer', () => {
  it('returns undefined when there is no server file', async () => {
    await expect(runningServer(temporaryHome())).resolves.toBeUndefined()
  })
})

describe('serveInThisProcess', () => {
  const stopping = { controller: new AbortController() }

  afterEach(() => {
    stopping.controller.abort()
    stopping.controller = new AbortController()
  })

  function serve(home: string, port = 0, stopSignal = stopping.controller.signal): Promise<number> {
    return serveInThisProcess({
      home,
      port,
      checkMilliseconds: 10,
      otherServerMilliseconds: 100,
      stopSignal,
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

  it('throws ServerAlreadyRunningError with the port when a server already runs for the home folder', async () => {
    const home = homeForServer()
    const started = await startServerProcess(serverStart(home))
    const serving = serve(home)

    await expect(serving).rejects.toThrow(ServerAlreadyRunningError)
    await expect(serving).rejects.toThrow(
      `A server for ${home} is already running on port ${started.port}. Stop it with: scratch-pad stop`,
    )
  })

  it('keeps the server file of the running server when another server fails to start', async () => {
    const home = temporaryHome()
    const port = await serve(home)

    await expect(serve(home)).rejects.toThrow(ServerAlreadyRunningError)
    expect(readServerFile(home)).toStrictEqual({ pid: process.pid, port })
  })

  it('throws ServerAlreadyRunningError when another server holds the lock but never answers', async () => {
    const home = temporaryHome()
    const lock = ServerLock.claim(home)
    const serving = serve(home)

    await expect(serving).rejects.toThrow(ServerAlreadyRunningError)
    await expect(serving).rejects.toThrow(
      `Another server for ${home} is still starting. Run the command again in a few seconds.`,
    )
    lock?.release()
  })

  it('serves the home folder when an earlier server could not listen on its port', async () => {
    const home = temporaryHome()
    const other = await startedServer(temporaryHome())
    await expect(serve(home, other.port)).rejects.toThrow(ServerListenError)

    await expect(serve(home)).resolves.toBeGreaterThan(0)
  })

  it('removes the server file at once when the stop signal was aborted before the server listened', async () => {
    const home = temporaryHome()
    const stopped = new AbortController()
    stopped.abort()

    const port = await serve(home, 0, stopped.signal)

    expect(readServerFile(home)).toBeUndefined()
    await vi.waitFor(() => expect(scratchPadsOf(port)).rejects.toThrow('ECONNREFUSED'))
  })
})
