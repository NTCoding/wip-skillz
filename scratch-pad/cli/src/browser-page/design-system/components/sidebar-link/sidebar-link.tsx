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
  readonly subPages?: ReactNode
  // A new page has a green dot and a page with a changed section has an amber dot.
  readonly mark?: 'new' | 'changed' | undefined
}

const markLabels = { new: 'New', changed: 'Changed' } as const

export function SidebarLink(props: SidebarLinkProps) {
  const { href, icon = 'page', title, current, onNavigate, children, subPages, mark } = props
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
        {mark !== undefined && (
          <span
            className="sidebar-link__mark"
            data-mark={mark}
            role="img"
            aria-label={markLabels[mark]}
            title={markLabels[mark]}
          />
        )}
      </a>
      {current && children}
      {subPages !== undefined && <ul className="sidebar-link__sub-pages">{subPages}</ul>}
    </li>
  )
}
