import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useCurrentSection, type PageAddress } from './current-section'

const noSection: PageAddress = { section: undefined, navigations: 0 }

function headingAt(id: string, top: number): HTMLElement {
  const heading = document.createElement('h2')
  heading.id = id
  vi.spyOn(heading, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, top, 100, 30))
  document.body.append(heading)
  return heading
}

function scrolledToTheBottom(): void {
  vi.spyOn(Element.prototype, 'scrollHeight', 'get').mockReturnValue(1500)
  vi.spyOn(window, 'scrollY', 'get').mockReturnValue(1500 - window.innerHeight)
}

afterEach(() => {
  document.body.replaceChildren()
})

describe('useCurrentSection', () => {
  it('returns the last section above the reading line when the page is scrolled', async () => {
    const last = headingAt('layout', 600)
    headingAt('retry-limit', -400)
    headingAt('wait', 80)
    const { result } = renderHook(() =>
      useCurrentSection(['retry-limit', 'wait', 'layout', 'missing'], noSection),
    )
    await waitFor(() => expect(result.current).toBe('wait'))
    vi.spyOn(last, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 10, 100, 30))
    act(() => {
      window.dispatchEvent(new Event('scroll'))
    })
    expect(result.current).toBe('layout')
  })

  it('works the section out again when the size of the window changes', async () => {
    const last = headingAt('layout', 600)
    headingAt('wait', 80)
    const { result } = renderHook(() => useCurrentSection(['wait', 'layout'], noSection))
    await waitFor(() => expect(result.current).toBe('wait'))
    vi.spyOn(last, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 10, 100, 30))
    act(() => {
      window.dispatchEvent(new Event('resize'))
    })
    expect(result.current).toBe('layout')
  })

  it('returns the last section when Nick has scrolled to the bottom of the page', async () => {
    headingAt('retry-limit', -400)
    headingAt('wait', 80)
    headingAt('layout', 600)
    scrolledToTheBottom()
    const { result } = renderHook(() =>
      useCurrentSection(['retry-limit', 'wait', 'layout'], noSection),
    )
    await waitFor(() => expect(result.current).toBe('layout'))
  })

  it('keeps the section that Nick went to until he scrolls, even at the bottom of the page', async () => {
    headingAt('wait', 80)
    headingAt('layout', 300)
    scrolledToTheBottom()
    const { result, rerender } = renderHook(
      (address: PageAddress) => useCurrentSection(['wait', 'layout'], address),
      { initialProps: noSection },
    )
    await waitFor(() => expect(result.current).toBe('layout'))
    rerender({ section: 'wait', navigations: 1 })
    act(() => {
      window.dispatchEvent(new Event('scroll'))
    })
    expect(result.current).toBe('wait')
    act(() => {
      window.dispatchEvent(new Event('wheel'))
    })
    expect(result.current).toBe('layout')
  })

  it('ignores an address whose section isn’t one of the sections', async () => {
    headingAt('wait', 500)
    const { result } = renderHook(() =>
      useCurrentSection(['wait'], { section: 'c-1', navigations: 0 }),
    )
    await waitFor(() => expect(result.current).toBe('wait'))
  })

  it('returns the first section when every section is below the reading line', async () => {
    headingAt('retry-limit', 500)
    const { result } = renderHook(() => useCurrentSection(['retry-limit'], noSection))
    await waitFor(() => expect(result.current).toBe('retry-limit'))
  })

  it('returns undefined when the page doesn’t have any sections', async () => {
    const { result } = renderHook(() => useCurrentSection([], noSection))
    await act(() => new Promise((resolve) => requestAnimationFrame(resolve)))
    expect(result.current).toBeUndefined()
  })
})
