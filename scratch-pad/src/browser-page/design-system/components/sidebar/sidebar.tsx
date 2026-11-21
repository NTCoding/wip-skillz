import { type ReactNode } from 'react'
import { IconButton } from '../icon-button/icon-button'
import './sidebar.css'

interface SidebarProps {
  readonly label: string
  readonly heading: string
  readonly collapsed: boolean
  readonly onCollapsedChange: (collapsed: boolean) => void
  readonly children: ReactNode
}

export function Sidebar({ label, heading, collapsed, onCollapsedChange, children }: SidebarProps) {
  return (
    <nav className="sidebar" aria-label={label} data-collapsed={collapsed}>
      <div className="sidebar__scroll" hidden={collapsed}>
        <p className="sidebar__heading">{heading}</p>
        <ul className="sidebar__list">{children}</ul>
      </div>
      <div className="sidebar__foot">
        <IconButton
          icon={collapsed ? 'sidebar-expand' : 'sidebar-collapse'}
          label={collapsed ? 'Expand the sidebar' : 'Collapse the sidebar'}
          onClick={() => onCollapsedChange(!collapsed)}
        />
      </div>
    </nav>
  )
}
