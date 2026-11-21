import { describe, expect, it } from 'vitest'
import { exportPad, exportPadAddresses, pageSummaries } from './browser-page-fixtures'
import { type PageSummary } from './api-responses'
import { pageListEntries, pageOfFileName, parentsOf, subPagesOf, topLevelPages } from './page-tree'

function summaryOf(page: string, parent: string | undefined): PageSummary {
  return {
    page,
    file: page,
    parent,
    title: undefined,
    description: undefined,
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
