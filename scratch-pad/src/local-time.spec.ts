import { describe, expect, it, vi } from 'vitest'
import { localDate, localTime } from './local-time'

describe('localTime', () => {
  it('prints the date and the minute in the time zone of the machine when the time is stored in UTC', () => {
    vi.stubEnv('TZ', 'Asia/Tokyo')

    expect(localTime('2026-03-14T18:05:00.000Z')).toBe('2026-03-15 03:05')
  })
})

describe('localDate', () => {
  it('prints the year, the month and the day with 2 digits when the month and the day are small', () => {
    expect(localDate(new Date(2026, 2, 4, 9, 30))).toBe('2026-03-04')
  })
})
