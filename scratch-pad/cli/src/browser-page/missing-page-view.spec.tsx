import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { retryQuestion } from './browser-page-fixtures'
import { MissingPageView } from './missing-page-view'

describe('MissingPageView', () => {
  it('shows each thread of the deleted page without a reply box when the page is read only', () => {
    render(
      <MissingPageView
        file="queue.md"
        threads={[retryQuestion]}
        pageThreads={[retryQuestion]}
        outbox={[]}
        actions={undefined}
      />,
    )
    const card = screen.getByRole('region', { name: 'Comment c-1' })
    expect(within(card).getAllByRole('listitem')).toHaveLength(2)
    expect(within(card).queryByRole('textbox')).toBeNull()
  })
})
