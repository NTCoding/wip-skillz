import { useCallback, useEffect, useState } from 'react'
import { type ViewedPage } from './api-responses'
import { type BrowserRoute, type PadAddresses } from './browser-route'

interface BrowserNavigation {
  readonly route: BrowserRoute
  readonly navigate: (href: string) => void
  // Changes the address without adding an entry to the history
  readonly replace: (href: string) => void
  readonly navigations: number
}

export function useBrowserNavigation(routeOf: PadAddresses['routeOf']): BrowserNavigation {
  const [route, setRoute] = useState(() => routeOf(window.location))
  const [navigations, setNavigations] = useState(0)
  useEffect(() => {
    const followHistory = (): void => setRoute(routeOf(window.location))
    window.addEventListener('popstate', followHistory)
    return () => window.removeEventListener('popstate', followHistory)
  }, [routeOf])
  const navigate = useCallback(
    (href: string) => {
      const url = new URL(href, window.location.href)
      window.history.pushState(null, '', url)
      setRoute(routeOf(url))
      setNavigations((count) => count + 1)
    },
    [routeOf],
  )
  const replace = useCallback(
    (href: string) => {
      const url = new URL(href, window.location.href)
      window.history.replaceState(null, '', url)
      setRoute(routeOf(url))
    },
    [routeOf],
  )
  return { route, navigate, replace, navigations }
}

export function scrollTargetOf(
  route: BrowserRoute,
  page: ViewedPage | undefined,
  threadsRead: boolean,
  improvementsRead: boolean,
): string | undefined {
  if (route.kind === 'improvements') {
    if (!improvementsRead) {
      return undefined
    }
    return route.section === undefined ? route.kind : `${route.kind}#${route.section}`
  }
  if (route.kind !== 'page') {
    return route.kind
  }
  if (page?.page !== `pages/${route.file}` || !threadsRead) {
    return undefined
  }
  return route.section === undefined ? route.file : `${route.file}#${route.section}`
}

// A target is a heading, the card of a thread or a decision block. The card and the decision block
// receive the focus too. That's how Nick can write in them straight after he has chosen an item
// of his Inbox.
export function useScrollOnNavigation(target: string | undefined, navigations: number): void {
  useEffect(() => {
    if (target === undefined) {
      return
    }
    const section = target.split('#')[1]
    const element = section === undefined ? null : document.getElementById(section)
    if (element === null) {
      window.scrollTo(0, 0)
      return
    }
    element.scrollIntoView()
    if (element.hasAttribute('tabindex')) {
      element.focus({ preventScroll: true })
    }
  }, [target, navigations])
}
