import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { navigationClick, type Navigate } from '../../navigation-click'
import { Icon } from '../icon/icon'
import './panel-menu.css'

// One item in the menu of the Inbox or of the Outbox. A page item is a new page. A section item
// is a section that has changed since Nick last read the section. A queued item is a comment or a
// reply in the outbox.
export interface PanelMenuItem {
  readonly key: string
  readonly href: string
  readonly kind: 'reply' | 'decision' | 'page' | 'section' | 'queued'
  readonly heading: string
  readonly where: string
  readonly quote: string | undefined
  readonly last: string | undefined
  readonly time: string | undefined
  readonly shownTime: string | undefined
  readonly linkLabel: string | undefined
}

interface PanelMenuProps {
  readonly id: string | undefined
  readonly labelledBy: string
  readonly items: readonly PanelMenuItem[]
  readonly onNavigate: Navigate
  // The menu calls onChoose before it goes to the item that Nick chose.
  readonly onChoose: () => void
  // If Nick presses Tab in the menu, the menu will call onTab. If onTab is undefined, Tab will
  // move the focus to the next control as usual.
  readonly onTab: (() => void) | undefined
}

function ItemContent({ item }: { readonly item: PanelMenuItem }) {
  return (
    <>
      <span className="panel-menu__dot" data-kind={item.kind} aria-hidden="true" />
      <span className="panel-menu__main">
        <span className="panel-menu__head">
          <span className="panel-menu__what">{item.heading}</span>
          {item.time !== undefined && (
            <time className="panel-menu__time" dateTime={item.time}>
              {item.shownTime}
            </time>
          )}
        </span>
        <span className="panel-menu__where" data-kind={item.kind}>
          {item.where}
        </span>
        {item.quote !== undefined && (
          <span className="panel-menu__quote" data-kind={item.kind}>
            {item.quote}
          </span>
        )}
        {item.last !== undefined && <span className="panel-menu__last">{item.last}</span>}
        {item.linkLabel !== undefined && (
          <span className="panel-menu__link">
            {item.linkLabel}
            <Icon name="chevron" />
          </span>
        )}
      </span>
    </>
  )
}

// The menu is only mounted while its panel is open so the first item is focused each time the
// panel opens. The arrow keys move the focus to the next or the previous item. Home moves the
// focus to the first item and End moves the focus to the last item.
export function PanelMenu({ id, labelledBy, items, onNavigate, onChoose, onTab }: PanelMenuProps) {
  const [chosen, setChosen] = useState(0)
  const links = useRef<(HTMLAnchorElement | null)[]>([])
  const lastIndex = items.length - 1
  // An item can be removed while the menu is open so the current item is never past the last one.
  const current = Math.min(chosen, lastIndex)
  useEffect(() => {
    links.current[0]?.focus()
  }, [])
  const focusItem = (index: number): void => {
    setChosen(index)
    links.current[index]?.focus()
  }
  const move = (event: KeyboardEvent<HTMLUListElement>): void => {
    if (event.key === 'Tab') {
      onTab?.()
      return
    }
    const targets: Readonly<Record<string, number>> = {
      ArrowDown: current === lastIndex ? 0 : current + 1,
      ArrowUp: current === 0 ? lastIndex : current - 1,
      Home: 0,
      End: lastIndex,
    }
    const target = targets[event.key]
    if (target === undefined) {
      return
    }
    event.preventDefault()
    focusItem(target)
  }
  return (
    <ul className="panel-menu" id={id} role="menu" aria-labelledby={labelledBy} onKeyDown={move}>
      {items.map((item, index) => (
        <li key={item.key} role="none">
          <a
            ref={(link) => {
              links.current[index] = link
            }}
            className="panel-menu__item"
            role="menuitem"
            tabIndex={index === current ? 0 : -1}
            href={item.href}
            onClick={(event) => {
              onChoose()
              navigationClick(item.href, onNavigate)(event)
            }}
          >
            <ItemContent item={item} />
          </a>
        </li>
      ))}
    </ul>
  )
}
