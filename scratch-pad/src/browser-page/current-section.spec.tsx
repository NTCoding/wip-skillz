import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useCurrentSection } from './current-section'

function headingAt(id: string, top: number): HTMLElement {
  const heading = document.createElement('h2')
  heading.id = id
  vi.spyOn(heading, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, top, 100, 30))
  document.body.append(heading)
  return heading
}

describe('useCurrentSection', () => {
  it('returns the last section above the reading line when the page is scrolled', async () => {
    const last = headingAt('layout', 600)
    const headings = [headingAt('retry-limit', -400), headingAt('wait', 80), last]
    const { result } = renderHook(() =>
      useCurrentSection(['retry-limit', 'wait', 'layout', 'missing']),
    )
    await waitFor(() => expect(result.current).toBe('wait'))
    vi.spyOn(last, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 10, 100, 30))
    act(() => {
      window.dispatchEvent(new Event('scroll'))
    })
    expect(result.current).toBe('layout')
    headings.forEach((heading) => heading.remove())
  })

  it('returns the last section when Nick has scrolled to the bottom of the page', async () => {
    const headings = [
      headingAt('retry-limit', -400),
      headingAt('wait', 80),
      headingAt('layout', 600),
    ]
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      value: 1500,
      configurable: true,
    })
    vi.spyOn(window, 'scrollY', 'get').mockReturnValue(1500 - window.innerHeight)
    const { result } = renderHook(() => useCurrentSection(['retry-limit', 'wait', 'layout']))
    await waitFor(() => expect(result.current).toBe('layout'))
    headings.forEach((heading) => heading.remove())
  })

  it('returns the first section when every section is below the reading line', async () => {
    const heading = headingAt('retry-limit', 500)
    const { result } = renderHook(() => useCurrentSection(['retry-limit']))
    await waitFor(() => expect(result.current).toBe('retry-limit'))
    heading.remove()
  })

  it('returns undefined when the page doesn’t have any sections', async () => {
    const { result } = renderHook(() => useCurrentSection([]))
    await act(() => new Promise((resolve) => requestAnimationFrame(resolve)))
    expect(result.current).toBeUndefined()
  })
})
