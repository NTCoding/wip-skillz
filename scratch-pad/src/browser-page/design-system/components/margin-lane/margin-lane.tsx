import { useLayoutEffect, useState, type ReactNode } from 'react'
import './margin-lane.css'

// The anchor of an item is the highlight of its thread or else the block with its lines.
// Both are looked up inside the closest element with data-margin-scope.
// In a narrow reading column, the lane is replaced by the marker of each item. Only the item
// whose popup is true is shown then, below its anchor.
export interface MarginItem {
  readonly key: string
  readonly anchorLines: string | undefined
  readonly content: ReactNode
  readonly marker: ReactNode
  readonly popup: boolean
}

interface MarginLaneProps {
  readonly label: string
  readonly items: readonly MarginItem[]
}

const gapBetweenItems = 12
const offsetAboveAnchor = 12
const gapBelowAnchor = 8

interface AnchorBox {
  readonly top: number
  readonly bottom: number
}

interface WantedTop {
  readonly item: HTMLElement
  readonly top: number
}

function anchorsOf(scope: Element, key: string, lines: string | undefined): Element[] {
  const highlights = [...scope.querySelectorAll(`[data-highlight~="${key}"]`)]
  if (highlights.length > 0) {
    return highlights
  }
  const block = lines === undefined ? null : scope.querySelector(`[data-lines="${lines}"]`)
  return block === null ? [] : [block]
}

function anchorBoxOf(scope: Element, laneTop: number, element: HTMLElement): AnchorBox {
  const key = String(element.dataset['key'] ?? element.dataset['marker'])
  const boxes = anchorsOf(scope, key, element.dataset['anchorLines']).map((anchor) =>
    anchor.getBoundingClientRect(),
  )
  const [first] = boxes
  if (first === undefined) {
    return { top: 0, bottom: 0 }
  }
  return {
    top: first.top - laneTop,
    bottom: Math.max(...boxes.map((box) => box.bottom)) - laneTop,
  }
}

interface Placement {
  readonly floor: number
  readonly placed: readonly WantedTop[]
}

function px(value: number): string {
  return `${Math.round(Math.max(0, value))}px`
}

function childrenWith(lane: HTMLElement, attribute: string): HTMLElement[] {
  return [...lane.children].filter(
    (child): child is HTMLElement => child instanceof HTMLElement && child.hasAttribute(attribute),
  )
}

export function layOutMarginLane(lane: HTMLElement, scope: Element): void {
  const laneTop = lane.getBoundingClientRect().top
  const anchored = childrenWith(lane, 'data-key').map((item) => ({
    item,
    box: anchorBoxOf(scope, laneTop, item),
  }))
  const wanted = anchored
    .map(({ item, box }) => ({ item, top: Math.max(0, box.top - offsetAboveAnchor) }))
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
    item.style.setProperty('--margin-item-top', px(top))
  }
  for (const { item, box } of anchored) {
    item.style.setProperty('--margin-popup-top', px(box.bottom + gapBelowAnchor))
  }
  for (const marker of childrenWith(lane, 'data-marker')) {
    marker.style.setProperty('--margin-marker-top', px(anchorBoxOf(scope, laneTop, marker).top))
  }
  lane.style.setProperty('--margin-lane-height', px(floor - gapBetweenItems))
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
          data-popup={item.popup}
        >
          {item.content}
        </div>
      ))}
      {items.map(
        (item) =>
          item.marker !== undefined && (
            <div
              key={`marker ${item.key}`}
              className="margin-lane__marker"
              data-marker={item.key}
              data-anchor-lines={item.anchorLines}
            >
              {item.marker}
            </div>
          ),
      )}
    </aside>
  )
}
