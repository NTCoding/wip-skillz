import { useLayoutEffect, useState, type ReactNode } from 'react'
import './margin-lane.css'

// The anchor of an item is the highlight of its thread or else the block with its lines.
// Both are looked up inside the closest element with data-margin-scope.
export interface MarginItem {
  readonly key: string
  readonly anchorLines: string | undefined
  readonly content: ReactNode
}

interface MarginLaneProps {
  readonly label: string
  readonly items: readonly MarginItem[]
}

const gapBetweenItems = 12
const offsetAboveAnchor = 12

interface WantedTop {
  readonly item: HTMLElement
  readonly top: number
}

function anchorOf(scope: Element, item: HTMLElement): Element | null {
  const highlight = scope.querySelector(`[data-highlight~="${item.dataset['key']}"]`)
  const lines = item.dataset['anchorLines']
  return highlight ?? (lines === undefined ? null : scope.querySelector(`[data-lines="${lines}"]`))
}

function wantedTop(scope: Element, laneTop: number, item: HTMLElement): WantedTop {
  const anchor = anchorOf(scope, item)
  const top = anchor === null ? 0 : anchor.getBoundingClientRect().top - laneTop - offsetAboveAnchor
  return { item, top: Math.max(0, top) }
}

interface Placement {
  readonly floor: number
  readonly placed: readonly WantedTop[]
}

export function layOutMarginLane(lane: HTMLElement, scope: Element): void {
  const laneTop = lane.getBoundingClientRect().top
  const wanted = [...lane.children]
    .filter((item) => item instanceof HTMLElement)
    .map((item) => wantedTop(scope, laneTop, item))
    .toSorted((first, second) => first.top - second.top)
  const { floor, placed } = wanted.reduce<Placement>(
    (done, { item, top }) => {
      const placedTop = Math.max(top, done.floor)
      return {
        floor: placedTop + item.offsetHeight + gapBetweenItems,
        placed: [...done.placed, { item, top: placedTop }],
      }
    },
    { floor: 0, placed: [] },
  )
  for (const { item, top } of placed) {
    item.style.setProperty('--margin-item-top', `${Math.round(top)}px`)
  }
  const bottomOfLastItem = Math.max(0, floor - gapBetweenItems)
  lane.style.setProperty('--margin-lane-height', `${Math.round(bottomOfLastItem)}px`)
}

export function MarginLane({ label, items }: MarginLaneProps) {
  const [lane, setLane] = useState<HTMLElement | null>(null)
  useLayoutEffect(() => {
    if (lane === null) {
      return undefined
    }
    const scope = lane.closest('[data-margin-scope]') ?? lane.ownerDocument.body
    layOutMarginLane(lane, scope)
    const observer = new ResizeObserver(() => layOutMarginLane(lane, scope))
    observer.observe(scope)
    for (const item of lane.children) {
      observer.observe(item)
    }
    return () => observer.disconnect()
  })
  return (
    <aside ref={setLane} className="margin-lane" aria-label={label}>
      {items.map((item) => (
        <div
          key={item.key}
          className="margin-lane__item"
          data-key={item.key}
          data-anchor-lines={item.anchorLines}
        >
          {item.content}
        </div>
      ))}
    </aside>
  )
}
