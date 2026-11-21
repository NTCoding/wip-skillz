import { type ReactNode } from 'react'
import { navigationClick, type Navigate } from '../../navigation-click'
import { Icon, type IconName } from '../icon/icon'
import './sidebar-link.css'

interface SidebarLinkProps {
  readonly href: string
  readonly icon?: IconName
  readonly title: string
  readonly current: boolean
  readonly onNavigate: Navigate
  readonly children?: ReactNode
}

export function SidebarLink(props: SidebarLinkProps) {
  const { href, icon = 'page', title, current, onNavigate, children } = props
  return (
    <li className="sidebar-link">
      <a
        className="sidebar-link__anchor"
        href={href}
        aria-current={current ? 'page' : undefined}
        onClick={navigationClick(href, onNavigate)}
      >
        <Icon name={icon} />
        <span className="sidebar-link__title">{title}</span>
      </a>
      {current && children}
    </li>
  )
}
