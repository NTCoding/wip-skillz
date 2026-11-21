import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TableOfContents } from './table-of-contents'

const entries = [
  { id: 'retry-limit', text: 'Retry limit', level: 2 },
  { id: 'wait', text: 'Wait between retries', level: 3 },
]

describe('TableOfContents', () => {
  it('lists the sections with their level and marks the current one when it is rendered', () => {
    render(
      <TableOfContents
        label="Sections"
        entries={entries}
        currentId="wait"
        hrefOf={(id) => `#${id}`}
        onNavigate={() => undefined}
      />,
    )
    expect(screen.getByRole('list', { name: 'Sections' }).children).toHaveLength(2)
    expect(
      screen.getByRole('link', { name: 'Wait between retries' }).getAttribute('aria-current'),
    ).toBe('location')
    expect(
      screen.getByRole('link', { name: 'Retry limit' }).getAttribute('aria-current'),
    ).toBeNull()
  })

  it('navigates to the section when Nick clicks it', async () => {
    const onNavigate = vi.fn<(href: string) => void>()
    render(
      <TableOfContents
        label="Sections"
        entries={entries}
        currentId={undefined}
        hrefOf={(id) => `/pad/#${id}`}
        onNavigate={onNavigate}
      />,
    )
    await userEvent.click(screen.getByRole('link', { name: 'Retry limit' }))
    expect(onNavigate).toHaveBeenCalledWith('/pad/#retry-limit')
  })

  it('renders nothing when the page doesn’t have any sections', () => {
    const { container } = render(
      <TableOfContents
        label="Sections"
        entries={[]}
        currentId={undefined}
        hrefOf={(id) => id}
        onNavigate={() => undefined}
      />,
    )
    expect(container.innerHTML).toBe('')
  })
})
