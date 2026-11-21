import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Outline } from './outline'

const entries = [
  { id: 'retry-limit', text: 'Retry limit', level: 2 },
  { id: 'wait', text: 'Wait between retries', level: 3 },
  { id: 'jitter', text: 'Jitter', level: 4 },
]

function renderOutline(
  shown: readonly (typeof entries)[number][],
  onNavigate: (href: string) => void = () => undefined,
) {
  return render(
    <Outline
      label="Sections of this page"
      entries={shown}
      currentId="wait"
      hrefOf={(id) => `/pad/#${id}`}
      onNavigate={onNavigate}
    />,
  )
}

describe('Outline', () => {
  it('draws one bar for each section and marks the bar of the current section when it is rendered', () => {
    const { container } = renderOutline(entries)
    const bars = [...container.querySelectorAll('[data-level]')].slice(0, 3)
    expect(bars.map((bar) => bar.getAttribute('data-level'))).toStrictEqual(['2', '3', '4'])
    expect(bars.map((bar) => bar.getAttribute('data-current'))).toStrictEqual([
      'false',
      'true',
      'false',
    ])
  })

  it('lists the sections as links and marks the current one when it is rendered', () => {
    renderOutline(entries)
    const outline = screen.getByRole('navigation', { name: 'Sections of this page' })
    expect(outline.querySelectorAll('a')).toHaveLength(3)
    expect(
      screen.getByRole('link', { name: 'Wait between retries' }).getAttribute('aria-current'),
    ).toBe('location')
    expect(screen.getByRole('link', { name: 'Jitter' }).getAttribute('aria-current')).toBeNull()
  })

  it('navigates to the section when Nick clicks it in the card', async () => {
    const onNavigate = vi.fn<(href: string) => void>()
    renderOutline(entries, onNavigate)
    await userEvent.click(screen.getByRole('link', { name: 'Retry limit' }))
    expect(onNavigate).toHaveBeenCalledWith('/pad/#retry-limit')
  })

  it('renders nothing when the page has fewer than 2 sections', () => {
    const { container } = renderOutline(entries.slice(0, 1))
    expect(container.innerHTML).toBe('')
  })
})
