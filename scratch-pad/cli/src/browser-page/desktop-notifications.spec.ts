import { describe, expect, it, vi } from 'vitest'
import { browserNotifications } from './desktop-notifications'

class FakeNotification extends EventTarget {
  static readonly permission: NotificationPermission = 'default'
  static readonly shown: FakeNotification[] = []
  closed = false

  constructor(
    readonly title: string,
    readonly options: NotificationOptions,
  ) {
    super()
    FakeNotification.shown.push(this)
  }

  static requestPermission(): Promise<NotificationPermission> {
    return Promise.resolve('granted')
  }

  close(): void {
    this.closed = true
  }
}

function notificationsOfTheBrowser() {
  vi.stubGlobal('Notification', FakeNotification)
  return browserNotifications()
}

describe('browserNotifications', () => {
  it('returns undefined when the browser doesn’t have the Notification API', () => {
    expect(browserNotifications()).toBeUndefined()
  })

  it('reads the permission and asks for it through the Notification API when the browser has it', async () => {
    const notifications = notificationsOfTheBrowser()
    expect(notifications?.permission()).toBe('default')
    expect(await notifications?.askPermission()).toBe('granted')
  })

  it('shows the title and the body and brings the tab to the front when Nick clicks the notification', () => {
    const focus = vi.spyOn(window, 'focus').mockImplementation(() => undefined)
    notificationsOfTheBrowser()?.show('Invoice export', 'A decision to make: Is 5 retries enough?')
    const shown = FakeNotification.shown.at(-1)
    shown?.dispatchEvent(new Event('click'))
    expect(shown?.title).toBe('Invoice export')
    expect(shown?.options).toStrictEqual({ body: 'A decision to make: Is 5 retries enough?' })
    expect(focus).toHaveBeenCalledWith()
    expect(shown?.closed).toBe(true)
  })

  it('tells that Nick is looking elsewhere when the tab is hidden', () => {
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
    expect(notificationsOfTheBrowser()?.lookingElsewhere()).toBe(true)
  })

  it('tells that Nick is looking elsewhere when the window doesn’t have the focus', () => {
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false)
    vi.spyOn(document, 'hasFocus').mockReturnValue(false)
    expect(notificationsOfTheBrowser()?.lookingElsewhere()).toBe(true)
  })

  it('tells that Nick is looking at the page when the tab is shown and the window has the focus', () => {
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false)
    vi.spyOn(document, 'hasFocus').mockReturnValue(true)
    expect(notificationsOfTheBrowser()?.lookingElsewhere()).toBe(false)
  })
})
