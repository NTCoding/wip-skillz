import { describe, expect, it } from 'vitest'
import { shownTime, timeAgo } from './message-time'

describe('shownTime', () => {
  it('shows the day, the month and the time of day in the time zone of the browser when a message has a time', () => {
    expect(shownTime('2026-11-20T21:09:33.825Z')).toBe('20 Nov, 21:09')
  })
})

describe('timeAgo', () => {
  const now = Date.parse('2026-11-20T22:00:00.000Z')

  it.each([
    ['2026-11-20T21:59:30.000Z', 'just now'],
    ['2026-11-20T21:35:00.000Z', '25 min ago'],
    ['2026-11-20T20:59:00.000Z', '1 hour ago'],
    ['2026-11-20T17:00:00.000Z', '5 hours ago'],
    ['2026-11-19T20:00:00.000Z', 'yesterday'],
    ['2026-11-16T22:00:00.000Z', '4 days ago'],
  ])('returns how long ago %s was', (time, ago) => {
    expect(timeAgo(time, now)).toBe(ago)
  })
})
