import { describe, expect, it } from 'vitest'
import { exportPadAddresses, progressTracker } from './browser-page-fixtures'
import { pageSummaries } from './page-summary-fixtures'
import { taskChipsOn } from './task-references'

const context = { addresses: exportPadAddresses, onNavigate: () => undefined }
const loadedPages = { status: 'loaded', value: pageSummaries } as const

describe('taskChipsOn', () => {
  it("doesn't show any chips while the progress tracker is loading", () => {
    expect(
      taskChipsOn({ status: 'loading' }, loadedPages, 'pages/first-retry.md', context),
    ).toBeUndefined()
  })

  it("doesn't show any chips on a page that isn't in the list of pages yet", () => {
    expect(
      taskChipsOn(
        { status: 'loaded', value: progressTracker },
        { status: 'loading' },
        'pages/first-retry.md',
        context,
      ),
    ).toBeUndefined()
  })
})
