import { Fragment } from 'react'
import { navigationClick, type Navigate } from '../../navigation-click'
import { Icon } from '../icon/icon'
import { type TextPart } from '../panel-menu/panel-menu'
import './item-list.css'

// One item of the Inbox or the Outbox, like a reply of the agent or a comment in the outbox.
// The quote of a decision is its question and the quote of a new page is its description. The
// quote of a task is the first line of what Nick has to do, which can contain links.
export interface ItemRow {
  readonly key: string
  readonly kind: string
  readonly where: string
  readonly quote: string | readonly TextPart[] | undefined
  readonly quoteKind: 'text' | 'decision' | 'description'
  readonly last: string | undefined
  // A second line under the last message, like the line that the agent wrote when reopening a decision
  readonly lastExtra?: string | undefined
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
  // The number in the heading. It can be lower than the number of rows, because a group can list
  // rows that aren't counted, like the updates to pages.
  readonly count: number
  readonly rows: readonly ItemRow[]
}

interface ItemListProps {
  readonly groups: readonly ItemGroup[]
  readonly onNavigate: Navigate
}

// A link to another site opens in a new tab rather than in the scratch pad.
function QuoteParts({
  parts,
  onNavigate,
}: {
  readonly parts: readonly TextPart[]
  readonly onNavigate: Navigate
}) {
  return parts.map((part, position) => {
    const key = `${String(position)} ${part.text}`
    if (part.href === undefined) {
      return <Fragment key={key}>{part.text}</Fragment>
    }
    return part.external === true ? (
      <a
        key={key}
        className="item-list__quote-link"
        href={part.href}
        target="_blank"
        rel="noreferrer"
      >
        {part.text}
      </a>
    ) : (
      <a
        key={key}
        className="item-list__quote-link"
        href={part.href}
        onClick={navigationClick(part.href, onNavigate)}
      >
        {part.text}
      </a>
    )
  })
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
          {typeof row.quote === 'string' ? (
            row.quote
          ) : (
            <QuoteParts parts={row.quote} onNavigate={onNavigate} />
          )}
        </p>
      )}
      {row.last !== undefined && <p className="item-list__last">{row.last}</p>}
      {row.lastExtra !== undefined && <p className="item-list__last">{row.lastExtra}</p>}
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
              <span className="item-list__count">{group.count}</span>
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
