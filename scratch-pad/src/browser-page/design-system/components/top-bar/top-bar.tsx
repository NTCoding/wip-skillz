import { type ReactNode } from 'react'
import { navigationClick, type Navigate } from '../../navigation-click'
import './top-bar.css'

interface TopBarProps {
  readonly title: string
  readonly titleHref: string
  readonly onNavigate: Navigate
  readonly tabs: ReactNode
  readonly actions: ReactNode
}

export function TopBar({ title, titleHref, onNavigate, tabs, actions }: TopBarProps) {
  return (
    <div className="top-bar">
      <a
        className="top-bar__title"
        href={titleHref}
        onClick={navigationClick(titleHref, onNavigate)}
      >
        <span className="top-bar__mark" aria-hidden="true">
          {title.slice(0, 1).toUpperCase()}
        </span>
        <span className="top-bar__name">{title}</span>
      </a>
      <div className="top-bar__tabs">{tabs}</div>
      <div className="top-bar__actions">{actions}</div>
    </div>
  )
}
