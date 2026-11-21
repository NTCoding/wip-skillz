import { Fragment, type ReactNode } from 'react'
import { navigationClick, type Navigate } from '../../navigation-click'
import './top-bar.css'

interface Crumb {
  readonly title: string
  readonly href: string
}

interface TopBarProps {
  readonly title: string
  readonly titleHref: string
  readonly parents: readonly Crumb[]
  readonly current: string | undefined
  readonly onNavigate: Navigate
  readonly actions: ReactNode
}

export function TopBar({ title, titleHref, parents, current, onNavigate, actions }: TopBarProps) {
  const links = [{ title, href: titleHref }, ...parents]
  return (
    <div className="top-bar">
      <nav className="top-bar__crumbs" aria-label="Breadcrumb">
        {current === undefined ? (
          <span className="top-bar__crumb" aria-current="page">
            {title}
          </span>
        ) : (
          <>
            {links.map((link) => (
              <Fragment key={link.href}>
                <a
                  className="top-bar__crumb"
                  href={link.href}
                  onClick={navigationClick(link.href, onNavigate)}
                >
                  {link.title}
                </a>
                <span className="top-bar__separator" aria-hidden="true">
                  /
                </span>
              </Fragment>
            ))}
            <span className="top-bar__crumb" aria-current="page">
              {current}
            </span>
          </>
        )}
      </nav>
      <div className="top-bar__actions">{actions}</div>
    </div>
  )
}
