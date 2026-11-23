import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { layOutMarginLane, MarginLane } from './margin-lane'

function placeAt(element: Element, top: number, height = 0): void {
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(DOMRect.fromRect({ y: top }))
  Object.defineProperty(element, 'offsetHeight', { value: height, configurable: true })
}

function laneWith(scope: HTMLElement): HTMLElement {
  scope.innerHTML = [
    '<p data-lines="3-3">The export job retries <mark data-highlight="c-1">5 times</mark>.</p>',
    '<p data-lines="5-5">The job writes one file per shop.</p>',
    '<aside>',
    '<div data-key="c-1" data-anchor-lines="3-3"></div>',
    '<div data-key="g-1" data-anchor-lines="3-3"></div>',
    '<div data-key="i-1" data-anchor-lines="5-5"></div>',
    '<div data-key="i-2"></div>',
    '</aside>',
  ].join('')
  const lane = scope.querySelector('aside')
  return lane ?? scope
}

function topsOf(lane: HTMLElement, property = '--margin-item-top'): (string | undefined)[] {
  return [...lane.querySelectorAll('div')].map((item) => item.style.getPropertyValue(property))
}

describe('layOutMarginLane', () => {
  it('puts each item beside its anchor and pushes down an item that would overlap the one above it', () => {
    const scope = document.createElement('div')
    const lane = laneWith(scope)
    placeAt(lane, 100)
    placeAt(scope.querySelector('mark') ?? scope, 212)
    placeAt(scope.querySelector('[data-lines="3-3"]') ?? scope, 200)
    placeAt(scope.querySelector('[data-lines="5-5"]') ?? scope, 260)
    const [comment, grammar, improvement, general] = [...lane.querySelectorAll('div')]
    placeAt(comment ?? lane, 0, 80)
    placeAt(grammar ?? lane, 0, 50)
    placeAt(improvement ?? lane, 0, 40)
    placeAt(general ?? lane, 0, 30)
    layOutMarginLane(lane, scope)
    expect(topsOf(lane)).toStrictEqual(['150px', '88px', '242px', '0px'])
  })

  it('puts each popup below the bottom of its anchor and each marker beside the top of its anchor', () => {
    const scope = document.createElement('div')
    const lane = laneWith(scope)
    lane.insertAdjacentHTML(
      'beforeend',
      '<span data-marker="c-1"></span><span data-marker="i-2"></span>',
    )
    placeAt(lane, 100)
    scope
      .querySelector('mark')
      ?.insertAdjacentHTML('afterend', '<mark data-highlight="c-1"></mark>')
    const [first, second] = [...scope.querySelectorAll('mark')]
    vi.spyOn(first ?? scope, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 212, 50, 32))
    vi.spyOn(second ?? scope, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 244, 50, 32))
    placeAt(scope.querySelector('[data-lines="3-3"]') ?? scope, 200)
    placeAt(scope.querySelector('[data-lines="5-5"]') ?? scope, 260)
    layOutMarginLane(lane, scope)
    expect(topsOf(lane, '--margin-popup-top')).toStrictEqual(['184px', '108px', '168px', '8px'])
    const markers = [...lane.querySelectorAll('span')]
    expect(
      markers.map((marker) => marker.style.getPropertyValue('--margin-marker-top')),
    ).toStrictEqual(['112px', '0px'])
  })

  it('pushes down a marker that would overlap the marker above it, including a marker without an anchor', () => {
    const scope = document.createElement('div')
    scope.innerHTML = [
      '<p data-lines="3-3">The export job retries <mark data-highlight="c-1">5 times</mark>.</p>',
      '<aside>',
      '<span data-marker="c-1" data-anchor-lines="3-3"></span>',
      '<span data-marker="g-1" data-anchor-lines="3-3"></span>',
      '<span data-marker="i-1"></span>',
      '<span data-marker="i-2"></span>',
      '</aside>',
    ].join('')
    const lane = scope.querySelector('aside') ?? scope
    placeAt(lane, 100)
    placeAt(scope.querySelector('mark') ?? scope, 212)
    placeAt(scope.querySelector('p') ?? scope, 200)
    for (const marker of lane.querySelectorAll('span')) {
      placeAt(marker, 0, 26)
    }
    layOutMarginLane(lane, scope)
    expect(
      [...lane.querySelectorAll('span')].map((marker) =>
        marker.style.getPropertyValue('--margin-marker-top'),
      ),
    ).toStrictEqual(['130px', '100px', '0px', '30px'])
  })

  it('makes the lane as tall as the bottom of its last item so that a card never runs past the page', () => {
    const scope = document.createElement('div')
    const lane = laneWith(scope)
    placeAt(lane, 100)
    placeAt(scope.querySelector('[data-lines="5-5"]') ?? scope, 1060)
    for (const item of lane.querySelectorAll('div')) {
      placeAt(item, 0, 600)
    }
    layOutMarginLane(lane, scope)
    expect(lane.style.getPropertyValue('--margin-lane-height')).toBe('2436px')
  })

  it('computes the layout once, with the first top of every new item, before it turns on the transition of the new items', () => {
    const scope = document.createElement('div')
    const lane = laneWith(scope)
    placeAt(scope.querySelector('[data-lines="5-5"]') ?? scope, 260)
    const item = lane.querySelector<HTMLElement>('[data-key="i-1"]') ?? lane
    const computed: { readonly top: string; readonly placed: boolean }[] = []
    vi.spyOn(lane, 'getBoundingClientRect').mockImplementation(() => {
      computed.push({
        top: item.style.getPropertyValue('--margin-item-top'),
        placed: item.hasAttribute('data-placed'),
      })
      return DOMRect.fromRect({ y: 100 })
    })
    layOutMarginLane(lane, scope)
    layOutMarginLane(lane, scope)
    expect([computed, item.hasAttribute('data-placed')]).toStrictEqual([
      [
        { top: '', placed: false },
        { top: '148px', placed: false },
        { top: '148px', placed: true },
      ],
      true,
    ])
  })

  it('places the marker of an item that is hidden behind its marker in the lane like a card, rather than the item itself', () => {
    const scope = document.createElement('div')
    scope.innerHTML = [
      '<p data-lines="3-3">The export job retries 5 times.</p>',
      '<p data-lines="5-5">The job writes one file per shop.</p>',
      '<aside>',
      '<span data-marker="c-4" data-anchor-lines="3-3" data-behind-marker="true"></span>',
      '<div data-key="c-4" data-anchor-lines="3-3" data-behind-marker="true"></div>',
      '<span data-marker="c-1" data-anchor-lines="5-5" data-behind-marker="false"></span>',
      '<div data-key="c-1" data-anchor-lines="5-5" data-behind-marker="false"></div>',
      '</aside>',
    ].join('')
    const lane = scope.querySelector('aside') ?? scope
    placeAt(lane, 100)
    placeAt(scope.querySelector('[data-lines="3-3"]') ?? scope, 200)
    placeAt(scope.querySelector('[data-lines="5-5"]') ?? scope, 260)
    const [hiddenMarker, hiddenCard, marker, card] = [...lane.children]
    placeAt(hiddenMarker ?? lane, 0, 26)
    placeAt(hiddenCard ?? lane, 0, 220)
    placeAt(marker ?? lane, 0, 26)
    placeAt(card ?? lane, 0, 80)
    layOutMarginLane(lane, scope)
    expect(
      [...lane.children].map((child) =>
        child instanceof HTMLElement ? child.style.getPropertyValue('--margin-item-top') : '',
      ),
    ).toStrictEqual(['100px', '', '', '148px'])
    expect(lane.style.getPropertyValue('--margin-lane-height')).toBe('228px')
  })

  it('makes the lane 0 pixels tall when the lane doesn’t have any items', () => {
    const lane = document.createElement('aside')
    layOutMarginLane(lane, document.createElement('div'))
    expect(lane.style.getPropertyValue('--margin-lane-height')).toBe('0px')
  })
})

describe('MarginLane', () => {
  it('shows each item in a region of the margin when items are given', () => {
    render(
      <MarginLane
        label="Comments and notes"
        items={[
          {
            key: 'c-1',
            anchorLines: '3-3',
            content: <p>Is 5 retries enough?</p>,
            marker: <button type="button">Comment c-1</button>,
            popup: true,
          },
        ]}
      />,
    )
    const lane = screen.getByRole('complementary', { name: 'Comments and notes' })
    expect(lane.textContent).toBe('Comment c-1Is 5 retries enough?')
    expect(lane.lastElementChild?.getAttribute('data-anchor-lines')).toBe('3-3')
    expect(lane.lastElementChild?.getAttribute('data-popup')).toBe('true')
    expect(lane.firstElementChild?.getAttribute('data-marker')).toBe('c-1')
  })

  it('leaves out the marker of an item that doesn’t have a marker', () => {
    render(
      <MarginLane
        label="Comments and notes"
        items={[
          {
            key: 'draft',
            anchorLines: '3-3',
            content: <p>New comment</p>,
            marker: undefined,
            popup: true,
          },
        ]}
      />,
    )
    const lane = screen.getByRole('complementary', { name: 'Comments and notes' })
    expect(lane.children).toHaveLength(1)
  })

  it('closes the popup of an item and moves the focus to its marker when the item goes behind its marker in a wide reading column', () => {
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1200)
    const onClosePopup = vi.fn<() => void>()
    const lane = (behindMarker: boolean, close: (() => void) | undefined) => (
      <MarginLane
        label="Comments and notes"
        items={[
          {
            key: 'c-1',
            anchorLines: '3-3',
            content: <button type="button">Resolve c-1</button>,
            marker: <button type="button">Comment c-1</button>,
            popup: true,
            behindMarker,
          },
        ]}
        onClosePopup={close}
      />
    )
    const { rerender } = render(lane(false, onClosePopup))
    rerender(lane(true, onClosePopup))
    expect(onClosePopup).toHaveBeenCalledTimes(1)
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Comment c-1' }))
    rerender(lane(false, undefined))
    screen.getByRole('button', { name: 'Resolve c-1' }).focus()
    rerender(lane(true, undefined))
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Comment c-1' }))
  })

  it('leaves the popup of an item open when the item goes behind its marker in a narrow reading column or is behind its marker from the start', () => {
    const onClosePopup = vi.fn<() => void>()
    const lane = (key: string, behindMarker: boolean) => (
      <MarginLane
        label="Comments and notes"
        items={[
          {
            key,
            anchorLines: '3-3',
            content: <p>Is 5 retries enough?</p>,
            marker: <button type="button">Comment {key}</button>,
            popup: true,
            behindMarker,
          },
        ]}
        onClosePopup={onClosePopup}
      />
    )
    const { rerender } = render(lane('c-1', false))
    rerender(lane('c-1', true))
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1200)
    rerender(lane('c-4', true))
    expect(onClosePopup).not.toHaveBeenCalled()
  })

  it('marks an item and its marker when the item is hidden behind its marker', () => {
    render(
      <MarginLane
        label="Comments and notes"
        items={[
          {
            key: 'c-4',
            anchorLines: '3-3',
            content: <p>Does the job handle the shops one after another?</p>,
            marker: <button type="button">Comment c-4</button>,
            popup: false,
            behindMarker: true,
          },
          {
            key: 'c-1',
            anchorLines: '5-5',
            content: <p>Is 5 retries enough?</p>,
            marker: <button type="button">Comment c-1</button>,
            popup: false,
          },
        ]}
      />,
    )
    const lane = screen.getByRole('complementary', { name: 'Comments and notes' })
    expect(
      [...lane.children].map((child) => child.getAttribute('data-behind-marker')),
    ).toStrictEqual(['true', 'true', 'false', 'false'])
  })

  it('looks for the anchors inside the closest margin scope when the lane has one', () => {
    render(
      <div data-margin-scope>
        <p data-lines="3-3">The export job retries 5 times.</p>
        <MarginLane
          label="Comments and notes"
          items={[
            {
              key: 'c-1',
              anchorLines: '3-3',
              content: <p>Is 5 retries enough?</p>,
              marker: undefined,
              popup: false,
            },
          ]}
        />
      </div>,
    )
    const item = screen.getByText('Is 5 retries enough?').parentElement
    expect(item?.style.getPropertyValue('--margin-item-top')).toBe('0px')
  })

  it('asks to close the popup when Nick presses Escape or puts the pointer down outside the popup', () => {
    const onClosePopup = vi.fn<() => void>()
    render(
      <>
        <p>The export job retries 5 times.</p>
        <MarginLane
          label="Comments and notes"
          items={[
            {
              key: 'c-1',
              anchorLines: '3-3',
              content: <p>Is 5 retries enough?</p>,
              marker: <button type="button">Comment c-1</button>,
              popup: true,
            },
          ]}
          onClosePopup={onClosePopup}
        />
      </>,
    )
    fireEvent.pointerDown(screen.getByText('Is 5 retries enough?'))
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Comment c-1' }))
    fireEvent.keyDown(document.body, { key: 'Enter' })
    expect(onClosePopup).not.toHaveBeenCalled()
    fireEvent.pointerDown(screen.getByText('The export job retries 5 times.'))
    fireEvent.keyDown(document.body, { key: 'Escape' })
    expect(onClosePopup).toHaveBeenCalledTimes(2)
  })

  it('doesn’t ask to close anything when a pointer goes down and there isn’t a popup', () => {
    const onClosePopup = vi.fn<() => void>()
    render(
      <MarginLane
        label="Comments and notes"
        items={[
          {
            key: 'c-1',
            anchorLines: '3-3',
            content: <p>Is 5 retries enough?</p>,
            marker: undefined,
            popup: false,
          },
        ]}
        onClosePopup={onClosePopup}
      />,
    )
    fireEvent.pointerDown(document.body)
    expect(onClosePopup).not.toHaveBeenCalled()
  })

  it('lays the items out again when a card changes its height without a new render of the lane', () => {
    const observers: ResizeObserverInThisTest[] = []
    class ResizeObserverInThisTest {
      readonly observed: Element[] = []

      constructor(readonly resized: () => void) {
        observers.push(this)
      }

      observe(element: Element): void {
        this.observed.push(element)
      }

      disconnect(): void {
        this.observed.length = 0
      }
    }
    vi.stubGlobal('ResizeObserver', ResizeObserverInThisTest)
    const card = (key: string, anchorLines: string) => ({
      key,
      anchorLines,
      content: <p>Is 5 retries enough?</p>,
      marker: undefined,
      popup: false,
    })
    render(
      <div data-margin-scope>
        <p data-lines="3-3">The export job retries 5 times.</p>
        <p data-lines="5-5">The job writes one file per shop.</p>
        <MarginLane label="Comments and notes" items={[card('c-1', '3-3'), card('c-2', '5-5')]} />
      </div>,
    )
    const lane = screen.getByRole('complementary', { name: 'Comments and notes' })
    const [first, second] = [...lane.children]
    placeAt(lane, 100)
    placeAt(document.querySelector('[data-lines="3-3"]') ?? lane, 200)
    placeAt(document.querySelector('[data-lines="5-5"]') ?? lane, 220)
    placeAt(first ?? lane, 0, 80)
    placeAt(second ?? lane, 0, 50)
    const observer = observers.at(-1)
    observer?.resized()
    const grown = topsOf(lane)
    placeAt(first ?? lane, 0, 30)
    observer?.resized()

    expect(observer?.observed).toStrictEqual(expect.arrayContaining([first, second]))
    expect([grown, topsOf(lane)]).toStrictEqual([
      ['88px', '180px'],
      ['88px', '130px'],
    ])
  })
})
