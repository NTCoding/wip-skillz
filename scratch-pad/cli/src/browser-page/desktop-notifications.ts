// The Notification API of the browser. start-browser-page.tsx passes it to the page so that a test
// can pass a fake instead of a real Notification.
export interface DesktopNotifications {
  readonly permission: () => NotificationPermission
  readonly askPermission: () => Promise<NotificationPermission>
  // Returns true while the tab is hidden or the window doesn't have the focus.
  readonly lookingElsewhere: () => boolean
  readonly show: (title: string, body: string) => void
}

// Returns true while the tab is hidden or the window doesn't have the focus. The blinking title of
// the tab calls this function too. That's why the function works without the Notification API.
export function lookingElsewhere(): boolean {
  return document.hidden || !document.hasFocus()
}

// If the browser doesn't have the Notification API, the page won't show the notifications button.
// A click on a notification brings the tab of the scratch pad to the front.
export function browserNotifications(): DesktopNotifications | undefined {
  return 'Notification' in window
    ? {
        permission: () => Notification.permission,
        askPermission: () => Notification.requestPermission(),
        lookingElsewhere,
        show: (title, body) => {
          const notification = new Notification(title, { body })
          notification.addEventListener('click', () => {
            window.focus()
            notification.close()
          })
        },
      }
    : undefined
}
