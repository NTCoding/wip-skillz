import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { type PreviewContent } from '../link-preview/link-preview'
import { PageLink, previewDelayMilliseconds } from './page-link'

const preview: PreviewContent = {
  title: 'Invoice template',
  path: 'Invoice export / Invoice template',
  paragraphs: [{ text: 'Each invoice shows the tax number.', heading: false }],
}

class MissingPageError extends Error {
  constructor() {
    super('There isn’t any page called missing.md')
  }
}

afterEach(() => {
  vi.useRealTimers()
})

function renderLink(
  loadPreview: () => Promise<PreviewContent | undefined>,
  onNavigate = vi.fn<(href: string) => void>(),
) {
  render(
    <PageLink href="/pad/invoice-template.md" onNavigate={onNavigate} loadPreview={loadPreview}>
      the invoice template
    </PageLink>,
  )
  return screen.getByRole('link', { name: 'the invoice template' })
}

async function hoverFor(link: HTMLElement, milliseconds: number): Promise<void> {
  fireEvent.mouseEnter(link)
  await act(async () => {
    vi.advanceTimersByTime(milliseconds)
    await Promise.resolve()
  })
}

describe('PageLink', () => {
  it('doesn’t show any preview or throw when the target page doesn’t exist', async () => {
    const link = renderLink(() => Promise.reject(new MissingPageError()))
    await act(async () => {
      fireEvent.focus(link)
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    expect(screen.queryByRole('tooltip')).toBeNull()
    expect(link.getAttribute('aria-describedby')).toBeNull()
  })

  it('shows the preview of the target page when Nick hovers over the link long enough', async () => {
    vi.useFakeTimers()
    const link = renderLink(() => Promise.resolve(preview))
    await hoverFor(link, previewDelayMilliseconds)
    expect(screen.getByRole('tooltip').textContent).toContain('Each invoice shows the tax number.')
    expect(link.getAttribute('aria-describedby')).toBe(screen.getByRole('tooltip').id)
  })

  it('doesn’t show the preview when the pointer leaves the link before the delay', async () => {
    vi.useFakeTimers()
    const loadPreview = vi.fn(() => Promise.resolve(preview))
    const link = renderLink(loadPreview)
    await hoverFor(link, previewDelayMilliseconds / 2)
    fireEvent.mouseLeave(link)
    await hoverFor(link, 0)
    fireEvent.mouseLeave(link)
    await act(async () => {
      vi.advanceTimersByTime(previewDelayMilliseconds)
      await Promise.resolve()
    })
    expect(loadPreview).not.toHaveBeenCalled()
  })

  it('drops a preview that arrives after the pointer has left the link', async () => {
    const pending = Promise.withResolvers<PreviewContent>()
    const link = renderLink(() => pending.promise)
    fireEvent.focus(link)
    await act(() => new Promise((resolve) => setTimeout(resolve, 0)))
    fireEvent.blur(link)
    await act(async () => {
      pending.resolve(preview)
      await pending.promise
    })
    expect(screen.queryByRole('tooltip')).toBeNull()
  })

  it('shows the preview at once and hides it again when the link gets and loses the focus', async () => {
    const link = renderLink(() => Promise.resolve(preview))
    await act(async () => {
      fireEvent.focus(link)
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    expect(screen.getByRole('tooltip').textContent).toContain('Invoice template')
    fireEvent.blur(link)
    expect(screen.queryByRole('tooltip')).toBeNull()
  })

  it('navigates to the target page when Nick clicks the link', async () => {
    const onNavigate = vi.fn<(href: string) => void>()
    await userEvent.click(renderLink(() => Promise.resolve(undefined), onNavigate))
    expect(onNavigate).toHaveBeenCalledWith('/pad/invoice-template.md')
  })
})
