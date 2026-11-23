import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useBlinkingTabTitle } from './blinking-tab-title'
import { type InboxEntry } from './design-system/design-system'

const pageTitle = 'Retry limit · Invoice export'

function entryOf(key: string, kind: InboxEntry['kind']): InboxEntry {
  return {
    key,
    href: `/invoice-export/pages/retry-limit#${key}`,
    kind,
    heading: kind === 'decision' ? 'A decision to make' : 'The agent replied',
    where: 'Retry limit',
    quote: undefined,
    last: undefined,
    time: undefined,
    shownTime: undefined,
    context: undefined,
  }
}

const reply = entryOf('c-1', 'reply')
const decision = entryOf('d-1', 'decision')
const newPage = entryOf('pages/invoice-template.md', 'page')

const state = { hidden: false, focused: false }

function showTabTitle(entries: readonly InboxEntry[]) {
  return renderHook(
    ({ title, inboxEntries }) => useBlinkingTabTitle(title, 'Invoice export', inboxEntries),
    { initialProps: { title: pageTitle, inboxEntries: entries } },
  )
}

function secondsPass(seconds: number): void {
  act(() => {
    vi.advanceTimersByTime(seconds * 1000)
  })
}

// The title of the tab after each of the waits, in seconds
function titlesAfter(...waits: readonly number[]): string[] {
  return waits.map((seconds) => {
    secondsPass(seconds)
    return document.title
  })
}

beforeEach(() => {
  vi.useFakeTimers()
  state.hidden = false
  state.focused = false
  vi.spyOn(document, 'hidden', 'get').mockImplementation(() => state.hidden)
  vi.spyOn(document, 'hasFocus').mockImplementation(() => state.focused)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('the blinking title of the tab', () => {
  it('switches to the count of the waiting items every 15 seconds for 3 seconds while Nick looks at another app', () => {
    showTabTitle([reply, decision])
    expect(titlesAfter(0, 14, 1, 2, 1, 11, 1)).toStrictEqual([
      pageTitle,
      pageTitle,
      '(2) Waiting for you · Invoice export',
      '(2) Waiting for you · Invoice export',
      pageTitle,
      pageTitle,
      '(2) Waiting for you · Invoice export',
    ])
  })

  it('blinks while the tab is hidden', () => {
    state.focused = true
    state.hidden = true
    showTabTitle([reply])
    secondsPass(15)
    expect(document.title).toBe('(1) Waiting for you · Invoice export')
  })

  it('only counts the entries that need an answer, like the Inbox button', () => {
    showTabTitle([reply, newPage])
    secondsPass(15)
    expect(document.title).toBe('(1) Waiting for you · Invoice export')
  })

  it('doesn’t blink while Nick looks at the tab', () => {
    state.focused = true
    showTabTitle([reply])
    secondsPass(15)
    expect(document.title).toBe(pageTitle)
  })

  it('doesn’t blink when only updates to pages are in the Inbox', () => {
    showTabTitle([newPage])
    secondsPass(15)
    expect(document.title).toBe(pageTitle)
  })

  it('shows the page title straight away when Nick comes back to the window', () => {
    showTabTitle([reply])
    secondsPass(15)
    state.focused = true
    act(() => {
      window.dispatchEvent(new Event('focus'))
    })
    expect(document.title).toBe(pageTitle)
    secondsPass(15)
    expect(document.title).toBe(pageTitle)
  })

  it('shows the page title straight away when Nick opens the tab again', () => {
    state.hidden = true
    state.focused = true
    showTabTitle([reply])
    secondsPass(15)
    state.hidden = false
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(document.title).toBe(pageTitle)
  })

  it('stops blinking and shows the page title when nothing waits for Nick any more', () => {
    const { rerender } = showTabTitle([reply])
    secondsPass(15)
    rerender({ title: pageTitle, inboxEntries: [] })
    expect(document.title).toBe(pageTitle)
    secondsPass(15)
    expect(document.title).toBe(pageTitle)
  })

  it('shows the new count and the new page title after they change', () => {
    const { rerender } = showTabTitle([reply])
    rerender({ title: 'Invoice template · Invoice export', inboxEntries: [reply, decision] })
    expect(document.title).toBe('Invoice template · Invoice export')
    secondsPass(15)
    expect(document.title).toBe('(2) Waiting for you · Invoice export')
    secondsPass(3)
    expect(document.title).toBe('Invoice template · Invoice export')
  })

  it('keeps the title of the page that Nick opens while the tab shows the count', () => {
    const { rerender } = showTabTitle([reply])
    secondsPass(15)
    rerender({ title: 'Invoice template · Invoice export', inboxEntries: [reply] })
    secondsPass(3)
    expect(document.title).toBe('Invoice template · Invoice export')
  })
})
