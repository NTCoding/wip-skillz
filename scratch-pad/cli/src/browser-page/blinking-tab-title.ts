import { useEffect } from 'react'
import { lookingElsewhere } from './desktop-notifications'
import { answerCountOf, type InboxEntry } from './design-system/design-system'

export function tabTitleOf(pageTitle: string | undefined, padTitle: string): string {
  return pageTitle === undefined || pageTitle === padTitle ? padTitle : `${pageTitle} · ${padTitle}`
}

const blinkInterval = 15_000
const waitingTitleDuration = 3_000

// Sets `title` as the title of the tab. A title that changes catches Nick's eye, whereas a title
// that stays the same doesn't. So while items in the Inbox wait for Nick and he's looking at another
// tab or another app, the title switches to "(2) Waiting for you · Invoice export" every 15 seconds
// for 3 seconds. When Nick comes back to the tab, the title will switch back to `title` straight
// away.
export function useBlinkingTabTitle(
  title: string,
  padTitle: string,
  inboxEntries: readonly InboxEntry[],
): void {
  // The count is the same as the count on the Inbox button.
  const waiting = answerCountOf(inboxEntries)
  useEffect(() => {
    document.title = title
    if (waiting === 0) {
      return undefined
    }
    // The timer that switches the title back after 3 seconds is cancelled when the effect is
    // cleaned up. Otherwise the timer would set an old title after Nick has opened another page.
    const backToTitle = new Set<ReturnType<typeof setTimeout>>()
    const showTitle = (): void => {
      document.title = title
    }
    const blink = setInterval(() => {
      if (lookingElsewhere()) {
        document.title = `(${waiting}) Waiting for you · ${padTitle}`
        const timer = setTimeout(() => {
          backToTitle.delete(timer)
          showTitle()
        }, waitingTitleDuration)
        backToTitle.add(timer)
      }
    }, blinkInterval)
    window.addEventListener('focus', showTitle)
    document.addEventListener('visibilitychange', showTitle)
    return () => {
      clearInterval(blink)
      backToTitle.forEach((timer) => clearTimeout(timer))
      window.removeEventListener('focus', showTitle)
      document.removeEventListener('visibilitychange', showTitle)
    }
  }, [title, padTitle, waiting])
}
