import { navigationClick, type Navigate } from '../../navigation-click'
import './table-of-contents.css'

export interface ContentsEntry {
  readonly id: string
  readonly text: string
  readonly level: number
}

interface TableOfContentsProps {
  readonly label: string
  readonly entries: readonly ContentsEntry[]
  readonly currentId: string | undefined
  readonly hrefOf: (id: string) => string
  readonly onNavigate: Navigate
}

export function TableOfContents({
  label,
  entries,
  currentId,
  hrefOf,
  onNavigate,
}: TableOfContentsProps) {
  if (entries.length === 0) {
    return null
  }
  return (
    <ul className="table-of-contents" aria-label={label}>
      {entries.map((entry) => (
        <li key={entry.id} className="table-of-contents__entry" data-level={entry.level}>
          <a
            className="table-of-contents__link"
            href={hrefOf(entry.id)}
            aria-current={entry.id === currentId ? 'location' : undefined}
            onClick={navigationClick(hrefOf(entry.id), onNavigate)}
          >
            {entry.text}
          </a>
        </li>
      ))}
    </ul>
  )
}
