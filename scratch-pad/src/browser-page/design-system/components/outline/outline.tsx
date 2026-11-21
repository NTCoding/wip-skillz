import { navigationClick, type Navigate } from '../../navigation-click'
import { type ContentsEntry } from '../table-of-contents/table-of-contents'
import './outline.css'

interface OutlineProps {
  readonly label: string
  readonly entries: readonly ContentsEntry[]
  readonly currentId: string | undefined
  readonly hrefOf: (id: string) => string
  readonly onNavigate: Navigate
}

export function Outline({ label, entries, currentId, hrefOf, onNavigate }: OutlineProps) {
  if (entries.length < 2) {
    return null
  }
  return (
    <nav className="outline" aria-label={label}>
      <div className="outline__bars" aria-hidden="true">
        {entries.map((entry) => (
          <span
            key={entry.id}
            className="outline__bar"
            data-level={entry.level}
            data-current={entry.id === currentId}
          />
        ))}
      </div>
      <div className="outline__card">
        <ul className="outline__list">
          {entries.map((entry) => (
            <li key={entry.id} className="outline__entry" data-level={entry.level}>
              <a
                className="outline__link"
                href={hrefOf(entry.id)}
                aria-current={entry.id === currentId ? 'location' : undefined}
                onClick={navigationClick(hrefOf(entry.id), onNavigate)}
              >
                {entry.text}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}
