import { navigationClick, type Navigate } from '../../navigation-click'
import { Icon, type IconName } from '../icon/icon'
import './tabs.css'

export interface Tab {
  readonly label: string
  readonly href: string
  readonly icon: IconName
  readonly current: boolean
}

interface TabsProps {
  readonly label: string
  readonly tabs: readonly Tab[]
  readonly onNavigate: Navigate
}

export function Tabs({ label, tabs, onNavigate }: TabsProps) {
  return (
    <nav className="tabs" aria-label={label}>
      <ul className="tabs__list">
        {tabs.map((tab) => (
          <li key={tab.href}>
            <a
              className="tabs__tab"
              href={tab.href}
              aria-current={tab.current ? 'page' : undefined}
              onClick={navigationClick(tab.href, onNavigate)}
            >
              <Icon name={tab.icon} />
              {tab.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
