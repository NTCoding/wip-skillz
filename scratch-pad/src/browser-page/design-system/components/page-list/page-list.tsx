import { navigationClick, type Navigate } from '../../navigation-click'
import { Icon } from '../icon/icon'
import './page-list.css'

export interface PageListEntry {
  readonly href: string
  readonly title: string
  readonly description: string | undefined
  readonly decisions: number
  readonly replies: number
}

interface PageListProps {
  readonly label: string
  readonly entries: readonly PageListEntry[]
  readonly onNavigate: Navigate
}

function countedText(count: number, one: string, many: string): string[] {
  if (count === 0) {
    return []
  }
  return [count === 1 ? `1 ${one}` : `${count} ${many}`]
}

function waitingText(entry: PageListEntry): string {
  const counts = [
    ...countedText(entry.decisions, 'decision', 'decisions'),
    ...countedText(entry.replies, 'reply', 'replies'),
  ]
  return counts.length === 0 ? 'Nothing for you' : `${counts.join(' and ')} for you`
}

export function PageList({ label, entries, onNavigate }: PageListProps) {
  if (entries.length === 0) {
    return null
  }
  return (
    <ul className="page-list" aria-label={label}>
      {entries.map((entry) => (
        <li key={entry.href} className="page-list__entry">
          <a
            className="page-list__link"
            href={entry.href}
            onClick={navigationClick(entry.href, onNavigate)}
          >
            <span className="page-list__text">
              <span className="page-list__title">{entry.title}</span>
              {entry.description !== undefined && (
                <span className="page-list__description">{entry.description}</span>
              )}
            </span>
            <span className="page-list__waiting" data-waiting={entry.decisions + entry.replies > 0}>
              {waitingText(entry)}
            </span>
            <Icon name="chevron" />
          </a>
        </li>
      ))}
    </ul>
  )
}
