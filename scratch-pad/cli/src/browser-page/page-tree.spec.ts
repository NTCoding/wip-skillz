import { describe, expect, it } from 'vitest'
import { exportPad, exportPadAddresses, pageSummaries } from './browser-page-fixtures'
import { type PageSummary } from './api-responses'
import { type FullTreeNode } from './design-system/design-system'
import {
  fullTreeNodes,
  pageListEntries,
  pageOfFileName,
  parentsOf,
  subPagesOf,
  subtreeOf,
  topLevelPages,
} from './page-tree'

function summaryOf(page: string, parent: string | undefined): PageSummary {
  return {
    page,
    file: page,
    number: undefined,
    parent,
    title: undefined,
    description: undefined,
    headings: [],
    openThreads: 0,
    waitingForNickWithSubPages: { decisions: 0, replies: 0 },
  }
}

function pagesOf(summaries: readonly { readonly page: string }[]): string[] {
  return summaries.map((summary) => summary.page)
}

describe('the page tree', () => {
  it('lists the top level pages in the order of the API when the pages have numbers or not', () => {
    expect(pagesOf(topLevelPages(pageSummaries))).toStrictEqual([
      'pages/index.md',
      'pages/invoice-template.md',
      'pages/retry-limit.md',
      'pages/shop-storage.md',
    ])
  })

  it('lists only the direct sub pages of a page', () => {
    expect(pagesOf(subPagesOf(pageSummaries, 'pages/retry-limit.md'))).toStrictEqual([
      'pages/wait-between-retries.md',
    ])
    expect(subPagesOf(pageSummaries, 'pages/invoice-template.md')).toStrictEqual([])
  })

  it('lists the parents of a page from the top level page down to its direct parent', () => {
    expect(pagesOf(parentsOf(pageSummaries, 'pages/first-retry.md'))).toStrictEqual([
      'pages/retry-limit.md',
      'pages/wait-between-retries.md',
    ])
    expect(parentsOf(pageSummaries, 'pages/retry-limit.md')).toStrictEqual([])
    expect(parentsOf(pageSummaries, 'pages/deleted.md')).toStrictEqual([])
  })

  it('stops the parents at a page that was already visited when the parents form a cycle', () => {
    const cycle = [summaryOf('pages/a.md', 'pages/b.md'), summaryOf('pages/b.md', 'pages/a.md')]
    expect(pagesOf(parentsOf(cycle, 'pages/a.md'))).toStrictEqual(['pages/b.md'])
    const ownParent = [summaryOf('pages/a.md', 'pages/a.md')]
    expect(parentsOf(ownParent, 'pages/a.md')).toStrictEqual([])
  })

  it('returns the id of the page whose file has the name with the number', () => {
    expect(pageOfFileName(pageSummaries, '2.1.1-first-retry.md')).toBe('pages/first-retry.md')
    expect(pageOfFileName(pageSummaries, 'first-retry.md')).toBeUndefined()
    expect(pageOfFileName(pageSummaries, '9-queue.md')).toBeUndefined()
  })

  it('lists every top level page apart from the index page with what waits for Nick under it', () => {
    expect(pageListEntries(exportPadAddresses, pageSummaries)).toStrictEqual([
      {
        href: `/${exportPad}/invoice-template.md`,
        title: 'Invoice template',
        description: 'Each invoice shows the tax number of the shop.',
        decisions: 0,
        replies: 0,
      },
      {
        href: `/${exportPad}/retry-limit.md`,
        title: 'retry-limit.md',
        description: undefined,
        decisions: 1,
        replies: 2,
      },
      {
        href: `/${exportPad}/shop-storage.md`,
        title: 'Shop storage',
        description: 'Each shop has its own storage.',
        decisions: 0,
        replies: 2,
      },
    ])
  })
})

function treeOf(nodes: readonly FullTreeNode[]): unknown[] {
  return nodes.map((node) =>
    node.children.length === 0
      ? `${node.kind} ${node.title} ${node.href}`
      : [`${node.kind} ${node.title} ${node.href}`, treeOf(node.children)],
  )
}

describe('the full tree', () => {
  it('shows the numbered pages, their sections and their sub pages on every level', () => {
    const pad = `/${exportPad}/`
    expect(treeOf(fullTreeNodes(exportPadAddresses, pageSummaries))).toStrictEqual([
      [
        `page 1 Invoice template ${pad}invoice-template.md`,
        [
          [
            `section The tax number ${pad}invoice-template.md#the-tax-number`,
            [`section Shops outside the EU ${pad}invoice-template.md#shops-outside-the-eu`],
          ],
          `section The logo ${pad}invoice-template.md#the-logo`,
        ],
      ],
      [
        `page 2 retry-limit.md ${pad}retry-limit.md`,
        [
          `section Why 5 retries ${pad}retry-limit.md#why-5-retries`,
          [
            `page 2.1 Wait between retries ${pad}wait-between-retries.md`,
            [
              [
                `section Why the wait doubles ${pad}wait-between-retries.md#why-the-wait-doubles`,
                [`section The longest wait ${pad}wait-between-retries.md#the-longest-wait`],
              ],
              [
                `page 2.1.1 First retry ${pad}first-retry.md`,
                [`section Why 30 seconds? ${pad}first-retry.md#why-30-seconds`],
              ],
            ],
          ],
        ],
      ],
      `page Shop storage ${pad}shop-storage.md`,
    ])
  })

  it('shows a section of level 3 beside the sections of level 2 when it comes before all of them and leaves out the other levels', () => {
    const page = {
      ...summaryOf('pages/retry-limit.md', undefined),
      headings: [
        { level: 1, text: 'Retry limit', id: 'retry-limit', line: 1 },
        { level: 3, text: 'The default', id: 'the-default', line: 5 },
        { level: 2, text: 'Why 5 retries', id: 'why-5-retries', line: 9 },
        {
          level: 4,
          text: 'The retries of a small shop',
          id: 'the-retries-of-a-small-shop',
          line: 13,
        },
      ],
    }
    expect(treeOf(fullTreeNodes(exportPadAddresses, [page]))).toStrictEqual([
      [
        `page retry-limit.md /${exportPad}/retry-limit.md`,
        [
          `section The default /${exportPad}/retry-limit.md#the-default`,
          `section Why 5 retries /${exportPad}/retry-limit.md#why-5-retries`,
        ],
      ],
    ])
  })

  it('shows a page only once when the list of pages has a cycle', () => {
    const cycle = [
      summaryOf('pages/a.md', undefined),
      summaryOf('pages/b.md', 'pages/a.md'),
      summaryOf('pages/a.md', 'pages/b.md'),
    ]
    expect(treeOf(fullTreeNodes(exportPadAddresses, cycle))).toStrictEqual([
      [`page a.md /${exportPad}/a.md`, [`page b.md /${exportPad}/b.md`]],
    ])
  })
})

describe('the subtree of a page', () => {
  it('starts at the top level page above the page', () => {
    const subtree = subtreeOf(exportPadAddresses, pageSummaries, 'pages/first-retry.md')
    expect(subtree?.currentHref).toBe(`/${exportPad}/first-retry.md`)
    expect(subtree?.root.title).toBe('2 retry-limit.md')
  })

  it('only shows the pages rather than the sections of the pages', () => {
    const titles = (node: FullTreeNode): unknown[] => [
      `${node.kind} ${node.title}`,
      ...node.children.map(titles),
    ]
    const subtree = subtreeOf(exportPadAddresses, pageSummaries, 'pages/wait-between-retries.md')
    expect(subtree === undefined ? undefined : titles(subtree.root)).toStrictEqual([
      'page 2 retry-limit.md',
      ['page 2.1 Wait between retries', ['page 2.1.1 First retry']],
    ])
  })

  it('starts at the page itself when the page is on the top level', () => {
    const subtree = subtreeOf(exportPadAddresses, pageSummaries, 'pages/shop-storage.md')
    expect(subtree?.root.href).toBe(`/${exportPad}/shop-storage.md`)
  })

  it('doesn’t have a subtree when the page isn’t in the full tree', () => {
    expect(subtreeOf(exportPadAddresses, pageSummaries, 'pages/index.md')).toBeUndefined()
    expect(subtreeOf(exportPadAddresses, pageSummaries, 'pages/deleted.md')).toBeUndefined()
  })
})
