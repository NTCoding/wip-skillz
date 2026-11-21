import { type ReactNode } from 'react'
import './app-frame.css'

export const narrowAppFrameQuery = '(width < 1280px)'

interface AppFrameProps {
  readonly topBar: ReactNode
  readonly sidebar: ReactNode
  readonly sidebarCollapsed: boolean
  readonly children: ReactNode
}

export function AppFrame({ topBar, sidebar, sidebarCollapsed, children }: AppFrameProps) {
  return (
    <div className="app-frame" data-sidebar={sidebarCollapsed ? 'collapsed' : 'open'}>
      <header className="app-frame__top-bar">{topBar}</header>
      <div className="app-frame__sidebar">{sidebar}</div>
      <main className="app-frame__main">{children}</main>
    </div>
  )
}
