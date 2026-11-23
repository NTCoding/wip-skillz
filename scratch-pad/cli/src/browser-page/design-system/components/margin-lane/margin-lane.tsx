import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import './margin-lane.css'

// The anchor of an item is the highlight of its thread or else the block with its lines.
// Both are looked up inside the closest element with data-margin-scope.
// In a narrow reading column, the lane is replaced by the marker of each item. Only the item
// whose popup is true is shown then, below its anchor. onClosePopup is called when Nick presses
// Escape or puts the pointer down outside that item and its marker.
// In a wide reading column, an item whose behindMarker is true is shown as its marker in the lane
// too, like the card of a resolved thread. Its marker is placed in the lane like a card. If its
// popup is true, the item is shown below its anchor over the other cards. If an item goes behind
// its marker while its popup is true, like the card of a thread that Nick has just resolved,
// onClosePopup is called and the focus moves to the marker of the item.
export interface MarginItem {
  readonly key: string
  readonly anchorLines: string | undefined
  readonly content: ReactNode
  readonly marker: ReactNode
  readonly popup: boolean
  readonly behindMarker?: boolean | undefined
}

interface MarginLaneProps {
  readonly label: string
  readonly items: readonly MarginItem[]
  readonly onClosePopup?: (() => void) | undefined
}

// The reading column shows the lane from this width. reading-column.spec.tsx checks that the CSS
// files use the same width.
export const wideReadingColumn = 1040
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

function isBehindMarker(element: HTMLElement): boolean {
  return element.dataset['behindMarker'] === 'true'
}

// In a wide reading column, the lane stacks the cards together with the markers of the items that
// are hidden behind their markers. A card starts a little above its anchor, whereas a marker starts
// at the top of its anchor.
function wideLaneTops(lane: HTMLElement, scope: Element, laneTop: number): WantedTop[] {
  const cards = childrenWith(lane, 'data-key')
    .filter((item) => !isBehindMarker(item))
    .map((item) => ({ item, top: anchorBoxOf(scope, laneTop, item).top - offsetAboveAnchor }))
  const markers = childrenWith(lane, 'data-marker')
    .filter(isBehindMarker)
    .map((item) => ({ item, top: anchorBoxOf(scope, laneTop, item).top }))
  return [...cards, ...markers].map(({ item, top }) => ({ item, top: Math.max(0, top) }))
}

export function layOutMarginLane(lane: HTMLElement, scope: Element): void {
  const laneTop = lane.getBoundingClientRect().top
  const anchored = childrenWith(lane, 'data-key').map((item) => ({
    item,
    box: anchorBoxOf(scope, laneTop, item),
  }))
  const cards = stacked(wideLaneTops(lane, scope, laneTop), gapBetweenItems)
  for (const { item, top } of cards.placed) {
    item.style.setProperty('--margin-item-top', px(top))
  }
  // An item moves to a new top with a transition, but an item that is placed for the first time is
  // shown at its top straight away. Otherwise a link to the card of the item would scroll to the
  // top of the lane, which is where the card starts its transition. The browser computes the new
  // top before data-placed turns the transition on. One layout is enough for every new item.
  const newItems = cards.placed.filter((card) => !card.item.hasAttribute('data-placed'))
  if (newItems.length > 0) {
    lane.getBoundingClientRect()
  }
  for (const { item } of newItems) {
    item.setAttribute('data-placed', '')
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
    // An Escape whose default was prevented, like the one that closes the subtree in the top bar,
    // doesn't close the card. The Escape that closes a full size view isn't received by this
    // listener, because FullSizeView stops its propagation.
    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' && !event.defaultPrevented) {
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

function scopeOf(lane: HTMLElement): Element {
  return lane.closest('[data-margin-scope]') ?? lane.ownerDocument.body
}

// The focus moves to the marker without a scroll, because the lane is already laid out by then. The
// control that Nick clicked in the item is hidden with the item.
function useCloseItemBehindMarker(
  lane: HTMLElement | null,
  items: readonly MarginItem[],
  onClosePopup: (() => void) | undefined,
): void {
  const behindMarker = useRef<ReadonlyMap<string, boolean>>(new Map())
  useLayoutEffect(() => {
    const [hidden] = items.filter(
      (item) =>
        item.popup && item.behindMarker === true && behindMarker.current.get(item.key) === false,
    )
    behindMarker.current = new Map(items.map((item) => [item.key, item.behindMarker === true]))
    if (lane === null || hidden === undefined || scopeOf(lane).clientWidth < wideReadingColumn) {
      return
    }
    onClosePopup?.()
    lane
      .querySelector<HTMLElement>(`:scope > [data-marker="${hidden.key}"] button`)
      ?.focus({ preventScroll: true })
  })
}

export function MarginLane({ label, items, onClosePopup }: MarginLaneProps) {
  const [lane, setLane] = useState<HTMLElement | null>(null)
  useClosePopup(lane, onClosePopup)
  // The ref places the items in the same commit that adds the lane to the page. The effects of the
  // page, like the scroll to the card of a link, run before the next commit. So the card has to
  // be in its place by then.
  const attachLane = useCallback((element: HTMLElement | null) => {
    setLane(element)
    if (element !== null) {
      layOutMarginLane(element, scopeOf(element))
    }
  }, [])
  useLayoutEffect(() => {
    if (lane === null) {
      return undefined
    }
    const scope = scopeOf(lane)
    layOutMarginLane(lane, scope)
    const observer = new ResizeObserver(() => layOutMarginLane(lane, scope))
    observer.observe(scope)
    for (const item of lane.children) {
      observer.observe(item)
    }
    return () => observer.disconnect()
  })
  useCloseItemBehindMarker(lane, items, onClosePopup)
  return (
    <aside ref={attachLane} className="margin-lane" aria-label={label}>
      {items.flatMap((item) => [
        item.marker === undefined ? null : (
          <div
            key={`marker ${item.key}`}
            className="margin-lane__marker"
            data-marker={item.key}
            data-anchor-lines={item.anchorLines}
            data-behind-marker={item.behindMarker === true}
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
          data-behind-marker={item.behindMarker === true}
        >
          {item.content}
        </div>,
      ])}
    </aside>
  )
}
