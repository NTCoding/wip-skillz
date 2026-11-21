import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PageList, type PageListEntry } from './page-list'

function entry(title: string, decisions: number, replies: number): PageListEntry {
  return {
    href: `/pad/${title}.md`,
    title,
    description: `The page about ${title}.`,
    decisions,
    replies,
  }
}

function renderList(
  entries: readonly PageListEntry[],
  onNavigate: (href: string) => void = () => undefined,
) {
  return render(<PageList label="Pages" entries={entries} onNavigate={onNavigate} />)
}

function waitingTextOf(title: string): string | null | undefined {
  return screen
    .getByRole('link', { name: new RegExp(`^${title}`) })
    .querySelector('.page-list__waiting')?.textContent
}

describe('PageList', () => {
  it('shows one link per page with its title, its description and what waits for Nick', () => {
    renderList([entry('Retry limit', 1, 2), entry('Invoice template', 0, 0)])
    const list = screen.getByRole('list', { name: 'Pages' })
    expect(
      within(list)
        .getAllByRole('link')
        .map((link) => link.getAttribute('href')),
    ).toStrictEqual(['/pad/Retry limit.md', '/pad/Invoice template.md'])
    expect(screen.getByRole('link', { name: /^Retry limit/ }).textContent).toBe(
      'Retry limitThe page about Retry limit.1 decision and 2 replies for you',
    )
  })

  it('says what waits for Nick in the singular and the plural when only one kind waits', () => {
    renderList([entry('Retry limit', 2, 0), entry('Invoice template', 0, 1)])
    expect(waitingTextOf('Retry limit')).toBe('2 decisions for you')
    expect(waitingTextOf('Invoice template')).toBe('1 reply for you')
  })

  it('says that nothing waits for Nick in the neutral tint when both counts are 0', () => {
    renderList([entry('Invoice template', 0, 0), entry('Retry limit', 1, 0)])
    const nothing = screen.getByText('Nothing for you')
    expect(nothing.getAttribute('data-waiting')).toBe('false')
    expect(screen.getByText('1 decision for you').getAttribute('data-waiting')).toBe('true')
  })

  it('leaves out the description when a page doesn’t have one', () => {
    renderList([{ ...entry('Shop storage', 0, 0), description: undefined }])
    expect(screen.getByRole('link').textContent).toBe('Shop storageNothing for you')
  })

  it('doesn’t show anything when there aren’t any pages', () => {
    const { container } = renderList([])
    expect(container.innerHTML).toBe('')
  })

  it('navigates to the page when Nick clicks a row', async () => {
    const onNavigate = vi.fn<(href: string) => void>()
    renderList([entry('Retry limit', 0, 0)], onNavigate)
    await userEvent.click(screen.getByText('Retry limit'))
    expect(onNavigate).toHaveBeenCalledWith('/pad/Retry limit.md')
  })
})
