import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FullTree, Subtree, type FullTreeNode } from './full-tree'

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

const deepJob: FullTreeNode[] = [
  page('1 How the job runs', [
    page('1.1 Retry limit', [
      page('1.1.1 First retry', [
        section('Why 30 seconds'),
        page('1.1.1.1 Wait for the queue', [section('The longest wait')]),
      ]),
    ]),
  ]),
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

  it('shows a collapsed level 3 node with its own chevron and the count of its children', async () => {
    renderTree(deepJob)
    await userEvent.click(toggle())
    const expand = screen.getByRole('button', { name: 'Expand 1.1.1 First retry' })
    expect(expand.getAttribute('aria-expanded')).toBe('false')
    expect(screen.getByText('+2 more')).toBeDefined()
    expect(linkTexts()).not.toContain('Why 30 seconds')
  })

  it('shows one more level and hides the count when Nick expands a level 3 node', async () => {
    renderTree(deepJob)
    await userEvent.click(toggle())
    await userEvent.click(screen.getByRole('button', { name: 'Expand 1.1.1 First retry' }))
    expect(linkTexts()).toStrictEqual([
      '1 How the job runs',
      '1.1 Retry limit',
      '1.1.1 First retry',
      'Why 30 seconds',
      '1.1.1.1 Wait for the queue',
    ])
    expect(screen.queryByText('+2 more')).toBeNull()
    expect(screen.getByText('+1 more')).toBeDefined()
    await userEvent.click(screen.getByRole('button', { name: 'Expand 1.1.1.1 Wait for the queue' }))
    expect(linkTexts()).toContain('The longest wait')
  })

  it('only counts the nodes on the first 3 levels', () => {
    renderTree(deepJob)
    expect(toggle().textContent).toBe('Full tree1 page and 2 sub pages')
  })
})

function hereTexts(): (string | null)[] {
  return within(screen.getByRole('list', { name: 'Where you are' }))
    .getAllByRole('listitem')
    .map((item) => item.querySelector('.full-tree__row')?.textContent ?? null)
}

describe('Subtree', () => {
  it('shows the nodes without links or chevrons and marks the current page', () => {
    const [root] = exportJob
    render(
      <Subtree
        label="Where you are"
        root={root ?? page('')}
        currentHref="/pad/1.1 Retry limit.md"
      />,
    )
    expect(screen.queryAllByRole('link')).toStrictEqual([])
    expect(screen.queryAllByRole('button')).toStrictEqual([])
    expect(hereTexts()).toContain('1.1 Retry limitYou are here')
    const current = screen.getByText('1.1 Retry limit').parentElement
    expect(current?.getAttribute('aria-current')).toBe('page')
  })

  it('shows the count of the children of a level 3 node', () => {
    const [root] = deepJob
    render(
      <Subtree
        label="Where you are"
        root={root ?? page('')}
        currentHref="/pad/1.1 Retry limit.md"
      />,
    )
    expect(hereTexts()).toStrictEqual([
      '1 How the job runs',
      '1.1 Retry limitYou are here',
      '1.1.1 First retry+2 more',
    ])
  })

  it('opens every parent of a current page that is deeper than level 3', () => {
    const [root] = deepJob
    render(
      <Subtree
        label="Where you are"
        root={root ?? page('')}
        currentHref="/pad/1.1.1.1 Wait for the queue.md"
      />,
    )
    expect(hereTexts()).toStrictEqual([
      '1 How the job runs',
      '1.1 Retry limit',
      '1.1.1 First retry',
      'Why 30 seconds',
      '1.1.1.1 Wait for the queue+1 moreYou are here',
    ])
  })

  it('doesn’t mark any node when the current page isn’t in the subtree', () => {
    const [root] = deepJob
    render(<Subtree label="Where you are" root={root ?? page('')} currentHref="/pad/other.md" />)
    expect(screen.queryByText('You are here')).toBeNull()
  })
})
