import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  removeTemporaryHomes,
  temporaryHome,
} from '../scratch-pad-folder/scratch-pad-folder-fixtures'
import { readServerFile, removeServerFile, serverLogPath, writeServerFile } from './server-file'

afterEach(() => {
  removeTemporaryHomes()
})

describe('readServerFile', () => {
  it('returns the pid and the port when the server file was written', () => {
    const home = temporaryHome()
    writeServerFile(home, { pid: 4321, port: 4747 })

    expect(readServerFile(home)).toStrictEqual({ pid: 4321, port: 4747 })
  })

  it('returns undefined when the server file was removed', () => {
    const home = temporaryHome()
    writeServerFile(home, { pid: 4321, port: 4747 })
    removeServerFile(home, 4321)

    expect(readServerFile(home)).toBeUndefined()
  })

  it.each(['{"pid": 4321', '{"pid": "4321", "port": 4747}', '{"pid": 4321}', '[4321, 4747]'])(
    'returns undefined when the server file contains %s',
    (text) => {
      const home = temporaryHome()
      writeFileSync(join(home, '.scratch-pad-server.json'), text)

      expect(readServerFile(home)).toBeUndefined()
    },
  )
})

describe('removeServerFile', () => {
  it('keeps the server file when the server file belongs to another process', () => {
    const home = temporaryHome()
    writeServerFile(home, { pid: 4321, port: 4747 })
    removeServerFile(home, 1234)

    expect(readServerFile(home)).toStrictEqual({ pid: 4321, port: 4747 })
  })
})

describe('writeServerFile', () => {
  it('creates the home folder when the home folder does not exist yet', () => {
    const home = join(temporaryHome(), 'scratch-pads')
    writeServerFile(home, { pid: 4321, port: 4747 })

    expect(readServerFile(home)).toStrictEqual({ pid: 4321, port: 4747 })
  })
})

describe('serverLogPath', () => {
  it('returns the log file in the home folder', () => {
    expect(serverLogPath('/pads')).toBe('/pads/.scratch-pad-server.log')
  })
})
