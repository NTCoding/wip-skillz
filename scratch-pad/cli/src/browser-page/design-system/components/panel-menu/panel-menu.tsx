import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react'
import { navigationClick, type Navigate } from '../../navigation-click'
import { Icon } from '../icon/icon'
import './panel-menu.css'

// A link to a section that Nick should read before he decides. The text is the text of the link in
// the context of the decision.
export interface ContextLink {
  readonly href: string
  readonly text: string
}

// The context of a decision, which the Inbox shows under the question. The lead is the first
// paragraph of the context. The links are in the order that Nick should read their sections.
export interface DecisionContext {
  readonly lead: string | undefined
  readonly links: readonly ContextLink[]
}

// One item in the menu of the Inbox or of the Outbox. A page item is a new page. A section item
// is a page whose sections have changed since Nick last read them. A queued item is a comment or a
// reply in the outbox. Only a decision has a context.
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
  readonly context: DecisionContext | undefined
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
  // A menu that opens from a menu button focuses its first item. A menu that a disclosure button
  // shows leaves the focus on that button.
  readonly focusFirstItem: boolean
}

function ItemContent({ item }: { readonly item: PanelMenuItem }) {
  return (
    <>
      <span className="panel-menu__dot" data-kind={item.kind} aria-hidden="true" />
      <span className="panel-menu__main">
        <span className="panel-menu__head">
          <span className="panel-menu__what" data-kind={item.kind}>
            {item.heading}
          </span>
          {item.time !== undefined && (
            <time className="panel-menu__time" dateTime={item.time}>
              {item.shownTime}
            </time>
          )}
        </span>
        <span className="panel-menu__where">{item.where}</span>
        {item.quote !== undefined && (
          <span className="panel-menu__quote" data-kind={item.kind}>
            {item.quote}
          </span>
        )}
        {item.context?.lead !== undefined && (
          <span className="panel-menu__lead">{item.context.lead}</span>
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

function contextLinksOf(item: PanelMenuItem): readonly ContextLink[] {
  return item.context?.links ?? []
}

function linkCount(items: readonly PanelMenuItem[]): number {
  return items.reduce((count, item) => count + 1 + contextLinksOf(item).length, 0)
}

// The arrow keys move the focus through every link of the menu. That's the link of each item and
// the links in the context of a decision, which come straight after the link of their decision.
// first is the position of the item's own link among them.
function withFirstLinks(items: readonly PanelMenuItem[]) {
  return items.map((item, index) => ({ item, first: linkCount(items.slice(0, index)) }))
}

// The menu is only mounted while its panel is open. That's why the first item is focused each
// time the panel opens when focusFirstItem is true. The arrow keys move the focus to the next or
// the previous link. Home moves the focus to the first link and End moves the focus to the last
// link.
export function PanelMenu({
  id,
  labelledBy,
  items,
  onNavigate,
  onChoose,
  onTab,
  focusFirstItem,
}: PanelMenuProps) {
  const [chosen, setChosen] = useState(0)
  const links = useRef<(HTMLAnchorElement | null)[]>([])
  const lastIndex = linkCount(items) - 1
  // An item can be removed while the menu is open so the current link is never past the last one.
  const current = Math.min(chosen, lastIndex)
  useEffect(() => {
    if (focusFirstItem) {
      links.current[0]?.focus()
    }
  }, [focusFirstItem])
  const focusLink = (index: number): void => {
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
    focusLink(target)
  }
  const linkProps = (index: number, href: string) => ({
    ref: (link: HTMLAnchorElement | null) => {
      links.current[index] = link
    },
    role: 'menuitem',
    tabIndex: index === current ? 0 : -1,
    href,
    onClick: (event: MouseEvent<HTMLAnchorElement>) => {
      onChoose()
      navigationClick(href, onNavigate)(event)
    },
  })
  return (
    <ul className="panel-menu" id={id} role="menu" aria-labelledby={labelledBy} onKeyDown={move}>
      {withFirstLinks(items).map(({ item, first }) => {
        const contextLinks = contextLinksOf(item)
        return (
          <li key={item.key} role="none">
            <a className="panel-menu__item" {...linkProps(first, item.href)}>
              <ItemContent item={item} />
            </a>
            {contextLinks.length > 0 && (
              <ol className="panel-menu__context" role="group" aria-label="Context">
                {contextLinks.map((link, linkIndex) => (
                  <li key={`${String(linkIndex)} ${link.href}`} role="none">
                    <a
                      className="panel-menu__context-link"
                      {...linkProps(first + 1 + linkIndex, link.href)}
                    >
                      {link.text}
                    </a>
                  </li>
                ))}
              </ol>
            )}
          </li>
        )
      })}
    </ul>
  )
}
