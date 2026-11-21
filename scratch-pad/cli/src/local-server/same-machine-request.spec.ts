import { describe, expect, it } from 'vitest'
import { refusalOf } from './same-machine-request'

const hostRefusal = 'The server only accepts requests to localhost:4747 or 127.0.0.1:4747.'
const originRefusal = 'The server only accepts changes from its own pages at http://127.0.0.1:4747.'

describe('refusalOf', () => {
  it.each(['localhost:4747', '127.0.0.1:4747'])(
    'accepts the request when the host is %s',
    (host) => {
      expect(refusalOf({ method: 'GET', host, origin: undefined }, 4747)).toBeUndefined()
    },
  )

  it.each([undefined, 'scratch-pad.example.com:4747', 'localhost:8080', 'localhost'])(
    'refuses the request when the host is %s',
    (host) => {
      expect(refusalOf({ method: 'GET', host, origin: undefined }, 4747)).toBe(hostRefusal)
    },
  )

  it.each(['http://localhost:4747', 'http://127.0.0.1:4747', undefined])(
    'accepts a write when the origin is %s',
    (origin) => {
      expect(refusalOf({ method: 'POST', host: 'localhost:4747', origin }, 4747)).toBeUndefined()
    },
  )

  it.each(['http://scratch-pad.example.com', 'null', 'https://localhost:4747'])(
    'refuses a write when the origin is %s',
    (origin) => {
      expect(refusalOf({ method: 'POST', host: 'localhost:4747', origin }, 4747)).toBe(
        originRefusal,
      )
    },
  )

  it('accepts a read when the origin is another site', () => {
    expect(
      refusalOf(
        { method: 'GET', host: 'localhost:4747', origin: 'http://scratch-pad.example.com' },
        4747,
      ),
    ).toBeUndefined()
  })
})
