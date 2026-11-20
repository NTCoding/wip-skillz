import { describe, expect, it } from 'vitest'
import { serverAddress, servingText, startedServerText, stoppedServerText } from './server-text'

describe('serverAddress', () => {
  it('returns the address of the scratch pad when a scratch pad is selected', () => {
    expect(serverAddress(4747, '2026-03-14-export-job')).toBe(
      'http://localhost:4747/2026-03-14-export-job/',
    )
  })

  it('returns the home address when no scratch pad is selected', () => {
    expect(serverAddress(4747, undefined)).toBe('http://localhost:4747/')
  })
})

describe('startedServerText', () => {
  it('prints that the server has started when no server was running', () => {
    expect(startedServerText({ port: 4747, wasRunning: false }, undefined)).toBe(
      'started the server: http://localhost:4747/',
    )
  })

  it('prints that the server is already running when a server was running', () => {
    expect(startedServerText({ port: 4747, wasRunning: true }, '2026-03-14-export-job')).toBe(
      'the server is already running: http://localhost:4747/2026-03-14-export-job/',
    )
  })
})

describe('stoppedServerText', () => {
  it('prints the address of the stopped server when a server was running', () => {
    expect(stoppedServerText(4747)).toBe('stopped the server on http://localhost:4747/')
  })

  it('prints that the server is not running when no server was running', () => {
    expect(stoppedServerText(undefined)).toBe("the server isn't running")
  })
})

describe('servingText', () => {
  it('prints the home folder and the address', () => {
    expect(servingText('/pads', 4747)).toBe(
      'serving the scratch pads in /pads on http://localhost:4747/',
    )
  })
})
