import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ItemList, type ItemRow } from './item-list'

const sent: ItemRow = {
  key: 'c-2',
  kind: 'Sent, no reply yet',
  where: 'Invoice template › The tax number',
  quote: 'A guest doesn’t have a tax number.',
  quoteKind: 'text',
  last: 'Nick: Does a guest see an empty field?',
  time: '2026-11-20T21:00:00.000Z',
  shownTime: 'Sent 25 min ago',
  late: true,
  linkLabel: 'Open the thread',
  href: '/pad/invoice-template.md#c-2',
}

const changed: ItemRow = {
  key: 'section pages/index.md retry-limit',
  kind: 'A section changed',
  where: 'Invoice export › Retry limit',
  quote: undefined,
  quoteKind: 'text',
  last: undefined,
  time: '2026-11-20T21:20:00.000Z',
  shownTime: 'Changed 20 Nov, 21:20',
  late: false,
  linkLabel: 'Open the page',
  href: '/pad/#retry-limit',
}

describe('ItemList', () => {
  it('shows each group under its heading with its count and each row with its kind, place, quote, last message and time', () => {
    render(
      <ItemList
        groups={[
          { title: 'Waiting for you', rows: [changed] },
          { title: 'Waiting for the agent', rows: [sent] },
        ]}
        onNavigate={() => undefined}
      />,
    )
    expect(screen.getAllByRole('heading').map((heading) => heading.textContent)).toStrictEqual([
      'Waiting for you1',
      'Waiting for the agent1',
    ])
    const rows = within(screen.getByRole('list', { name: 'Waiting for the agent' }))
    expect(rows.getByRole('listitem').textContent).toBe(
      'Sent, no reply yetSent 25 min agoInvoice template › The tax numberA guest doesn’t have a tax number.Nick: Does a guest see an empty field?Open the thread',
    )
    expect(rows.getByText('Sent 25 min ago').dataset['late']).toBe('true')
    expect(screen.getByText('Changed 20 Nov, 21:20').dataset['late']).toBe('false')
  })

  it('shows the rows without a heading when the group doesn’t have a title', () => {
    render(<ItemList groups={[{ title: undefined, rows: [sent] }]} onNavigate={() => undefined} />)
    expect(screen.queryByRole('heading')).toBeNull()
    expect(screen.getByRole('list', { name: 'Items' }).childElementCount).toBe(1)
  })

  it('navigates to the thread when Nick clicks the link of a row', async () => {
    const onNavigate = vi.fn<(href: string) => void>()
    render(<ItemList groups={[{ title: undefined, rows: [sent] }]} onNavigate={onNavigate} />)
    await userEvent.click(screen.getByRole('link', { name: 'Open the thread' }))
    expect(onNavigate).toHaveBeenCalledWith('/pad/invoice-template.md#c-2')
  })
})
