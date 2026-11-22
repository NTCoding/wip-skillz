import { useEffect, useLayoutEffect, useState, type ReactNode } from 'react'
import './margin-lane.css'

// The anchor of an item is the highlight of its thread or else the block with its lines.
// Both are looked up inside the closest element with data-margin-scope.
// In a narrow reading column, the lane is replaced by the marker of each item. Only the item
// whose popup is true is shown then, below its anchor. onClosePopup is called when Nick presses
// Escape or puts the pointer down outside that item and its marker.
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
  readonly onClosePopup?: (() => void) | undefined
}

const gapBetweenItems = 12
const gapBetweenMarkers = 4
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

interface Stacked {
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

// Each element starts at the top it wants, or straight below the element above it if the 2 would
// overlap. The elements are only pushed down.
function stacked(wanted: readonly WantedTop[], gap: number): Stacked {
  return wanted
    .toSorted((first, second) => first.top - second.top)
    .reduce<Stacked>(
      (done, { item, top }) => {
        const placedTop = Math.max(top, done.floor)
        return {
          floor: placedTop + item.offsetHeight + gap,
          placed: [...done.placed, { item, top: placedTop }],
        }
      },
      { floor: 0, placed: [] },
    )
}

export function layOutMarginLane(lane: HTMLElement, scope: Element): void {
  const laneTop = lane.getBoundingClientRect().top
  const anchored = childrenWith(lane, 'data-key').map((item) => ({
    item,
    box: anchorBoxOf(scope, laneTop, item),
  }))
  const cards = stacked(
    anchored.map(({ item, box }) => ({ item, top: Math.max(0, box.top - offsetAboveAnchor) })),
    gapBetweenItems,
  )
  for (const { item, top } of cards.placed) {
    item.style.setProperty('--margin-item-top', px(top))
  }
  for (const { item, box } of anchored) {
    item.style.setProperty('--margin-popup-top', px(box.bottom + gapBelowAnchor))
  }
  const markers = stacked(
    childrenWith(lane, 'data-marker').map((item) => ({
      item,
      top: Math.max(0, anchorBoxOf(scope, laneTop, item).top),
    })),
    gapBetweenMarkers,
  )
  for (const { item, top } of markers.placed) {
    item.style.setProperty('--margin-marker-top', px(top))
  }
  lane.style.setProperty('--margin-lane-height', px(cards.floor - gapBetweenItems))
}

function useClosePopup(lane: HTMLElement | null, onClosePopup: (() => void) | undefined): void {
  useEffect(() => {
    if (lane === null || onClosePopup === undefined) {
      return undefined
    }
    // Escape closes the full size view of a card first, rather than the card itself. An Escape whose
    // default was prevented, like the one that closes the subtree in the top bar, doesn't close it.
    const closeOnEscape = (event: KeyboardEvent): void => {
      if (
        event.key === 'Escape' &&
        !event.defaultPrevented &&
        document.documentElement.dataset['fullSize'] !== 'open'
      ) {
        onClosePopup()
      }
    }
    const closeOutside = (event: PointerEvent): void => {
      const popup = lane.querySelector<HTMLElement>(':scope > [data-popup="true"]')
      const key = popup?.dataset['key']
      const marker = lane.querySelector(`:scope > [data-marker="${key}"]`)
      const inside = [popup, marker].some(
        (element) => event.target instanceof Node && element?.contains(event.target),
      )
      if (popup !== null && !inside) {
        onClosePopup()
      }
    }
    document.addEventListener('keydown', closeOnEscape)
    document.addEventListener('pointerdown', closeOutside)
    return () => {
      document.removeEventListener('keydown', closeOnEscape)
      document.removeEventListener('pointerdown', closeOutside)
    }
  }, [lane, onClosePopup])
}

export function MarginLane({ label, items, onClosePopup }: MarginLaneProps) {
  const [lane, setLane] = useState<HTMLElement | null>(null)
  useClosePopup(lane, onClosePopup)
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
      {items.flatMap((item) => [
        item.marker === undefined ? null : (
          <div
            key={`marker ${item.key}`}
            className="margin-lane__marker"
            data-marker={item.key}
            data-anchor-lines={item.anchorLines}
          >
            {item.marker}
          </div>
        ),
        <div
          key={item.key}
          className="margin-lane__item"
          data-key={item.key}
          data-anchor-lines={item.anchorLines}
          data-popup={item.popup}
        >
          {item.content}
        </div>,
      ])}
    </aside>
  )
}
