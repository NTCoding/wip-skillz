import { navigationClick, type Navigate } from '../../navigation-click'
import { Icon } from '../icon/icon'
import './item-list.css'

// One item of the Inbox or the Outbox, like a reply of the agent or a comment in the outbox.
// The quote of a decision is its question and the quote of a new page is its description.
export interface ItemRow {
  readonly key: string
  readonly kind: string
  readonly where: string
  readonly quote: string | undefined
  readonly quoteKind: 'text' | 'decision' | 'description'
  readonly last: string | undefined
  readonly time: string | undefined
  readonly shownTime: string | undefined
  // A late item has waited for the agent for a long time, so its time is highlighted.
  readonly late: boolean
  readonly linkLabel: string
  readonly href: string
}

// A group without a title shows its rows without a heading.
export interface ItemGroup {
  readonly title: string | undefined
  readonly rows: readonly ItemRow[]
}

interface ItemListProps {
  readonly groups: readonly ItemGroup[]
  readonly onNavigate: Navigate
}

function Row({ row, onNavigate }: { readonly row: ItemRow; readonly onNavigate: Navigate }) {
  return (
    <li className="item-list__row">
      <p className="item-list__meta">
        <span className="item-list__kind">{row.kind}</span>
        {row.shownTime !== undefined && (
          <time className="item-list__time" dateTime={row.time} data-late={row.late}>
            {row.shownTime}
          </time>
        )}
      </p>
      <p className="item-list__where">{row.where}</p>
      {row.quote !== undefined && (
        <p className="item-list__quote" data-kind={row.quoteKind}>
          {row.quote}
        </p>
      )}
      {row.last !== undefined && <p className="item-list__last">{row.last}</p>}
      <a
        className="item-list__link"
        href={row.href}
        onClick={navigationClick(row.href, onNavigate)}
      >
        {row.linkLabel}
        <Icon name="chevron" />
      </a>
    </li>
  )
}

export function ItemList({ groups, onNavigate }: ItemListProps) {
  return (
    <div className="item-list">
      {groups.map((group) => (
        <section key={group.title ?? 'items'} className="item-list__group">
          {group.title !== undefined && (
            <h2 className="item-list__heading">
              {group.title}
              <span className="item-list__count">{group.rows.length}</span>
            </h2>
          )}
          <ol className="item-list__rows" aria-label={group.title ?? 'Items'}>
            {group.rows.map((row) => (
              <Row key={row.key} row={row} onNavigate={onNavigate} />
            ))}
          </ol>
        </section>
      ))}
    </div>
  )
}
