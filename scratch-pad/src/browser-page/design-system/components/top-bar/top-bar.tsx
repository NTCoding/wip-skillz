import { type ReactNode } from 'react'
import { navigationClick, type Navigate } from '../../navigation-click'
import './top-bar.css'

interface TopBarProps {
  readonly title: string
  readonly titleHref: string
  readonly current: string
  readonly onNavigate: Navigate
  readonly actions: ReactNode
}

export function TopBar({ title, titleHref, current, onNavigate, actions }: TopBarProps) {
  return (
    <div className="top-bar">
      <nav className="top-bar__crumbs" aria-label="Breadcrumb">
        <a
          className="top-bar__crumb"
          href={titleHref}
          onClick={navigationClick(titleHref, onNavigate)}
        >
          {title}
        </a>
        <span className="top-bar__separator" aria-hidden="true">
          /
        </span>
        <span className="top-bar__crumb" aria-current="page">
          {current}
        </span>
      </nav>
      <div className="top-bar__actions">{actions}</div>
    </div>
  )
}
