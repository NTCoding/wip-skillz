import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FullTree, type FullTreeNode } from './full-tree'

function section(title: string, children: readonly FullTreeNode[] = []): FullTreeNode {
  return { kind: 'section', title, href: `/pad/${title}`, children }
}

function page(title: string, children: readonly FullTreeNode[] = []): FullTreeNode {
  return { kind: 'page', title, href: `/pad/${title}.md`, children }
}

const exportJob: FullTreeNode[] = [
  page('1 How the job runs', [
    section('When the job starts', [section('Every night')]),
    page('1.1 Retry limit', [section('Why 5 retries'), section('Wait between retries')]),
  ]),
  page('2 Invoice template'),
]

function renderTree(
  nodes: readonly FullTreeNode[],
  onNavigate: (href: string) => void = () => undefined,
) {
  return render(<FullTree label="Full tree" nodes={nodes} onNavigate={onNavigate} />)
}

function toggle(): HTMLElement {
  return screen.getByRole('button', { name: /^Full tree/ })
}

function linkTexts(): (string | null)[] {
  return within(screen.getByRole('list', { name: 'Full tree' }))
    .getAllByRole('link')
    .map((link) => link.textContent)
}

describe('FullTree', () => {
  it('shows a collapsed toggle with the counts of the pages, sub pages and sections', () => {
    renderTree(exportJob)
    expect(toggle().textContent).toBe('Full tree2 pages, 1 sub page and 4 sections')
    expect(toggle().getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('list', { name: 'Full tree' })).toBeNull()
  })

  it('shows every node of the tree with every branch open when Nick expands the tree', async () => {
    renderTree(exportJob)
    await userEvent.click(toggle())
    expect(toggle().getAttribute('aria-expanded')).toBe('true')
    expect(linkTexts()).toStrictEqual([
      '1 How the job runs',
      'When the job starts',
      'Every night',
      '1.1 Retry limit',
      'Why 5 retries',
      'Wait between retries',
      '2 Invoice template',
    ])
  })

  it('gives a chevron only to the nodes with children', async () => {
    renderTree(exportJob)
    await userEvent.click(toggle())
    const chevrons = screen
      .getAllByRole('button', { name: /^Collapse/ })
      .map((button) => button.getAttribute('aria-label'))
    expect(chevrons).toStrictEqual([
      'Collapse 1 How the job runs',
      'Collapse When the job starts',
      'Collapse 1.1 Retry limit',
    ])
  })

  it('hides the children of a branch when Nick collapses that branch and shows them again when he expands it', async () => {
    renderTree(exportJob)
    await userEvent.click(toggle())
    await userEvent.click(screen.getByRole('button', { name: 'Collapse 1.1 Retry limit' }))
    const expand = screen.getByRole('button', { name: 'Expand 1.1 Retry limit' })
    expect(expand.getAttribute('aria-expanded')).toBe('false')
    expect(linkTexts()).not.toContain('Why 5 retries')
    expect(linkTexts()).toContain('Every night')
    await userEvent.click(expand)
    expect(linkTexts()).toContain('Why 5 retries')
  })

  it('keeps a branch collapsed when Nick collapses the whole tree and expands it again', async () => {
    renderTree(exportJob)
    await userEvent.click(toggle())
    await userEvent.click(screen.getByRole('button', { name: 'Collapse When the job starts' }))
    await userEvent.click(toggle())
    await userEvent.click(toggle())
    expect(linkTexts()).not.toContain('Every night')
  })

  it('shows a page icon on the pages and not on the sections', async () => {
    renderTree(exportJob)
    await userEvent.click(toggle())
    const iconOf = (name: string) =>
      screen.getByRole('link', { name }).querySelector('svg') !== null
    expect([iconOf('1.1 Retry limit'), iconOf('Why 5 retries')]).toStrictEqual([true, false])
  })

  it('navigates to the node when Nick clicks its link', async () => {
    const onNavigate = vi.fn<(href: string) => void>()
    renderTree(exportJob, onNavigate)
    await userEvent.click(toggle())
    await userEvent.click(screen.getByRole('link', { name: 'Wait between retries' }))
    expect(onNavigate).toHaveBeenCalledWith('/pad/Wait between retries')
  })

  it('only writes the counts that aren’t 0', () => {
    renderTree([page('1 Invoice template')])
    expect(toggle().textContent).toBe('Full tree1 page')
  })

  it('writes 2 counts with "and" between them', () => {
    renderTree([page('1 Invoice template', [section('The logo')]), page('2 Shop storage')])
    expect(toggle().textContent).toBe('Full tree2 pages and 1 section')
  })

  it('doesn’t show anything when there aren’t any pages', () => {
    const { container } = renderTree([])
    expect(container.innerHTML).toBe('')
  })
})
