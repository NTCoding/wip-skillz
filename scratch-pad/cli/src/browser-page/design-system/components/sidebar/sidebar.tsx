import { type ReactNode } from 'react'
import { navigationClick, type Navigate } from '../../navigation-click'
import { IconButton } from '../icon-button/icon-button'
import './sidebar.css'

interface SidebarProps {
  readonly label: string
  readonly title: string
  readonly titleHref: string
  readonly onNavigate: Navigate
  readonly views: ReactNode
  readonly heading: string
  readonly collapsed: boolean
  readonly onCollapsedChange: (collapsed: boolean) => void
  readonly footerTools?: ReactNode
  readonly children: ReactNode
}

export function Sidebar(props: SidebarProps) {
  const { label, title, titleHref, onNavigate, views, heading, collapsed, footerTools } = props
  return (
    <nav className="sidebar" aria-label={label} data-collapsed={collapsed}>
      <a
        className="sidebar__head"
        href={titleHref}
        hidden={collapsed}
        onClick={navigationClick(titleHref, onNavigate)}
      >
        <span className="sidebar__mark" aria-hidden="true">
          {title.slice(0, 1).toUpperCase()}
        </span>
        <span className="sidebar__name">{title}</span>
      </a>
      <div className="sidebar__scroll" hidden={collapsed}>
        <ul className="sidebar__list">{views}</ul>
        <p className="sidebar__heading">{heading}</p>
        <ul className="sidebar__list">{props.children}</ul>
      </div>
      <div className="sidebar__foot">
        {footerTools !== undefined && <div className="sidebar__foot-tools">{footerTools}</div>}
        <IconButton
          icon={collapsed ? 'sidebar-expand' : 'sidebar-collapse'}
          label={collapsed ? 'Expand the sidebar' : 'Collapse the sidebar'}
          onClick={() => props.onCollapsedChange(!collapsed)}
        />
      </div>
    </nav>
  )
}
