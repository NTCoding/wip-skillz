import { describe, expect, it } from 'vitest'
import { aThread } from '../threads/thread-fixtures'
import { nickInbox } from './nick-inbox'

function replied(id: string, time: string) {
  return aThread({ id, waitsFor: 'nick', messages: [{ author: 'agent', text: 'Done.', time }] })
}

describe('nickInbox', () => {
  it('returns the threads that wait for Nick with the oldest reply first', () => {
    const threads = [
      replied('c-2', '2026-03-14T11:00:00.000Z'),
      aThread({ id: 'c-3' }),
      replied('g-1', '2026-03-14T10:00:00.000Z'),
      aThread({ id: 'c-4', waitsFor: 'nobody' }),
    ]

    expect(nickInbox(threads).map((thread) => thread.id)).toStrictEqual(['g-1', 'c-2'])
  })
})
