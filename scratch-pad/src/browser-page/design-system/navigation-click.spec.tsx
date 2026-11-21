import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { navigationClick } from './navigation-click'

const seen = { preventedByLink: false }

function stopBrowser(event: MouseEvent): void {
  seen.preventedByLink = event.defaultPrevented
  event.preventDefault()
}

afterEach(() => {
  document.removeEventListener('click', stopBrowser)
})

function renderLink(onNavigate: (href: string) => void): HTMLElement {
  document.addEventListener('click', stopBrowser)
  render(
    <a href="/pad/retry-limit.md" onClick={navigationClick('/pad/retry-limit.md', onNavigate)}>
      Retry limit
    </a>,
  )
  return screen.getByRole('link', { name: 'Retry limit' })
}

describe('navigationClick', () => {
  it('navigates inside the page when Nick clicks the link with the main button', () => {
    const onNavigate = vi.fn<(href: string) => void>()
    fireEvent.click(renderLink(onNavigate))
    expect(onNavigate).toHaveBeenCalledWith('/pad/retry-limit.md')
    expect(seen.preventedByLink).toBe(true)
  })

  it.each([
    { metaKey: true },
    { ctrlKey: true },
    { shiftKey: true },
    { altKey: true },
    { button: 1 },
  ])('lets the browser open the link when Nick clicks with %o', (click) => {
    const onNavigate = vi.fn<(href: string) => void>()
    fireEvent.click(renderLink(onNavigate), click)
    expect(onNavigate).not.toHaveBeenCalled()
    expect(seen.preventedByLink).toBe(false)
  })
})
