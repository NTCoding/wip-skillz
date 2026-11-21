import { type ReactNode } from 'react'
import './app-frame.css'

export const narrowAppFrameQuery = '(width < 900px)'

interface AppFrameProps {
  readonly topBar: ReactNode
  readonly sidebar: ReactNode
  readonly sidebarCollapsed: boolean
  readonly onSidebarCollapse: () => void
  readonly children: ReactNode
}

export function AppFrame(props: AppFrameProps) {
  const { topBar, sidebar, sidebarCollapsed, onSidebarCollapse, children } = props
  return (
    <div className="app-frame" data-sidebar={sidebarCollapsed ? 'collapsed' : 'open'}>
      <div className="app-frame__sidebar">{sidebar}</div>
      {!sidebarCollapsed && (
        <button
          type="button"
          className="app-frame__scrim"
          aria-label="Close the sidebar"
          tabIndex={-1}
          onClick={() => onSidebarCollapse()}
        />
      )}
      <div className="app-frame__body">
        <header className="app-frame__top-bar">{topBar}</header>
        <main className="app-frame__main">{children}</main>
      </div>
    </div>
  )
}
