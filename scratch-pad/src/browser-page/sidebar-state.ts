import { useEffect, useState } from 'react'
import { savedSidebarCollapsed, saveSidebarCollapsed, type SavedSettings } from './saved-settings'

// The query of a narrow window, which is a MediaQueryList in the browser.
export interface NarrowWindow {
  readonly matches: boolean
  readonly addEventListener: (type: 'change', listener: () => void) => void
  readonly removeEventListener: (type: 'change', listener: () => void) => void
}

interface SidebarState {
  readonly collapsed: boolean
  readonly changeCollapsed: (collapsed: boolean) => void
}

function useNarrow(narrowWindow: NarrowWindow): boolean {
  const [narrow, setNarrow] = useState(narrowWindow.matches)
  useEffect(() => {
    const follow = (): void => setNarrow(narrowWindow.matches)
    narrowWindow.addEventListener('change', follow)
    return () => narrowWindow.removeEventListener('change', follow)
  }, [narrowWindow])
  return narrow
}

// A wide window keeps Nick's saved choice. A narrow window has its own state, which is never
// saved. That state starts closed and is closed again on every navigation and every time the
// window crosses the width of a narrow window.
export function useSidebarState(
  settings: SavedSettings,
  narrowWindow: NarrowWindow,
  navigations: number,
): SidebarState {
  const narrow = useNarrow(narrowWindow)
  const [wideCollapsed, setWideCollapsed] = useState(() => savedSidebarCollapsed(settings))
  const [narrowOpen, setNarrowOpen] = useState(false)
  const [followed, setFollowed] = useState({ narrow, navigations })
  if (followed.narrow !== narrow || followed.navigations !== navigations) {
    setFollowed({ narrow, navigations })
    setNarrowOpen(false)
  }
  const changeCollapsed = (collapsed: boolean): void => {
    if (narrow) {
      setNarrowOpen(!collapsed)
      return
    }
    setWideCollapsed(collapsed)
    saveSidebarCollapsed(settings, collapsed)
  }
  return { collapsed: narrow ? !narrowOpen : wideCollapsed, changeCollapsed }
}
