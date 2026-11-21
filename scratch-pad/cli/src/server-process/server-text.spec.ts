import { describe, expect, it } from 'vitest'
import { serverAddress, servingText, startedServerText, stoppedServerText } from './server-text'

describe('serverAddress', () => {
  it('returns the address of the scratch pad when a scratch pad is selected', () => {
    expect(serverAddress(4747, '2026-03-14-export-job')).toBe(
      'http://127.0.0.1:4747/2026-03-14-export-job/',
    )
  })

  it('returns the home address when no scratch pad is selected', () => {
    expect(serverAddress(4747, undefined)).toBe('http://127.0.0.1:4747/')
  })
})

describe('startedServerText', () => {
  it('prints that the server has started when no server was running', () => {
    expect(startedServerText({ port: 4747, how: 'started' }, undefined)).toBe(
      'started the server: http://127.0.0.1:4747/',
    )
  })

  it('prints that the server is already running when a server was running', () => {
    expect(startedServerText({ port: 4747, how: 'already-running' }, '2026-03-14-export-job')).toBe(
      'the server is already running: http://127.0.0.1:4747/2026-03-14-export-job/',
    )
  })

  it('prints that the server was restarted when a server of another build was running', () => {
    expect(startedServerText({ port: 4747, how: 'replaced' }, '2026-03-14-export-job')).toBe(
      'restarted the server with this version of scratch-pad: http://127.0.0.1:4747/2026-03-14-export-job/',
    )
  })
})

describe('stoppedServerText', () => {
  it('prints the address of the stopped server when a server was running', () => {
    expect(stoppedServerText(4747)).toBe('stopped the server on http://127.0.0.1:4747/')
  })

  it('prints that the server is not running when no server was running', () => {
    expect(stoppedServerText(undefined)).toBe("the server isn't running")
  })
})

describe('servingText', () => {
  it('prints the home folder and the address', () => {
    expect(servingText('/pads', 4747)).toBe(
      'serving the scratch pads in /pads on http://127.0.0.1:4747/',
    )
  })
})
