import { describe, expect, it } from 'vitest'
import { shownTime } from './message-time'

describe('shownTime', () => {
  it('shows the day, the month and the time of day in the time zone of the browser when a message has a time', () => {
    expect(shownTime('2026-11-20T21:09:33.825Z')).toBe('20 Nov, 21:09')
  })
})
