import { render, screen } from '@testing-library/react'
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

function topsOf(lane: HTMLElement): (string | undefined)[] {
  return [...lane.querySelectorAll('div')].map((item) =>
    item.style.getPropertyValue('--margin-item-top'),
  )
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
        items={[{ key: 'c-1', anchorLines: '3-3', content: <p>Is 5 retries enough?</p> }]}
      />,
    )
    const lane = screen.getByRole('complementary', { name: 'Comments and notes' })
    expect(lane.textContent).toBe('Is 5 retries enough?')
    expect(lane.firstElementChild?.getAttribute('data-anchor-lines')).toBe('3-3')
  })

  it('looks for the anchors inside the closest margin scope when the lane has one', () => {
    render(
      <div data-margin-scope>
        <p data-lines="3-3">The export job retries 5 times.</p>
        <MarginLane
          label="Comments and notes"
          items={[{ key: 'c-1', anchorLines: '3-3', content: <p>Is 5 retries enough?</p> }]}
        />
      </div>,
    )
    const item = screen.getByText('Is 5 retries enough?').parentElement
    expect(item?.style.getPropertyValue('--margin-item-top')).toBe('0px')
  })
})
