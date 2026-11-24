import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { type Thread } from './api-responses'
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

  it('leaves the card of a resolved thread out of the view when Nick presses Hide', async () => {
    const resolved: Thread = { ...retryQuestion, waitsFor: 'nobody' }
    render(
      <MissingPageView
        file="queue.md"
        threads={[resolved]}
        pageThreads={[resolved]}
        outbox={[]}
        actions={undefined}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Hide c-1' }))
    expect(screen.queryByRole('region', { name: 'Comment c-1' })).toBeNull()
  })
})
