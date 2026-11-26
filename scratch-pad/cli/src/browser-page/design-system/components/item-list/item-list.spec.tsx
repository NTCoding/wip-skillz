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
  it('shows each group under its heading with the count of the group and each row with its kind, place, quote, last message and time', () => {
    render(
      <ItemList
        groups={[
          { title: 'Waiting for you', count: 0, rows: [changed] },
          { title: 'Waiting for the agent', count: 1, rows: [sent] },
        ]}
        onNavigate={() => undefined}
      />,
    )
    expect(screen.getAllByRole('heading').map((heading) => heading.textContent)).toStrictEqual([
      'Waiting for you0',
      'Waiting for the agent1',
    ])
    const rows = within(screen.getByRole('list', { name: 'Waiting for the agent' }))
    expect(rows.getByRole('listitem').textContent).toBe(
      'Sent, no reply yetSent 25 min agoInvoice template › The tax numberA guest doesn’t have a tax number.Nick: Does a guest see an empty field?Open the thread',
    )
    expect(rows.getByText('Sent 25 min ago').dataset['late']).toBe('true')
    expect(screen.getByText('Changed 20 Nov, 21:20').dataset['late']).toBe('false')
  })

  it('shows the second line under the last message when a row has one', () => {
    render(
      <ItemList
        groups={[
          {
            title: undefined,
            count: 1,
            rows: [{ ...sent, lastExtra: 'The agent: Added who the team is.' }],
          },
        ]}
        onNavigate={() => undefined}
      />,
    )
    expect(
      [
        screen.getByText('Nick: Does a guest see an empty field?'),
        screen.getByText('The agent: Added who the team is.'),
      ].map((line) => line.tagName),
    ).toStrictEqual(['P', 'P'])
  })

  it('shows the rows without a heading when the group doesn’t have a title', () => {
    render(
      <ItemList
        groups={[{ title: undefined, count: 1, rows: [sent] }]}
        onNavigate={() => undefined}
      />,
    )
    expect(screen.queryByRole('heading')).toBeNull()
    expect(screen.getByRole('list', { name: 'Items' }).childElementCount).toBe(1)
  })

  it('navigates to the thread when Nick clicks the link of a row', async () => {
    const onNavigate = vi.fn<(href: string) => void>()
    render(
      <ItemList groups={[{ title: undefined, count: 1, rows: [sent] }]} onNavigate={onNavigate} />,
    )
    await userEvent.click(screen.getByRole('link', { name: 'Open the thread' }))
    expect(onNavigate).toHaveBeenCalledWith('/pad/invoice-template.md#c-2')
  })

  it('opens a page from a link in the quote of a task, and another site in a new tab', async () => {
    const onNavigate = vi.fn()
    const task: ItemRow = {
      ...changed,
      key: 't-8',
      kind: '4.2 Run the first export',
      quote: [
        { text: 'Read ' },
        { text: 'the retry limit', href: '/pad/retry-limit.md' },
        { text: ' and ' },
        { text: 'the bank rules', href: 'https://x.dev/rules', external: true },
      ],
      quoteKind: 'description',
      linkLabel: 'Open the task',
      href: '/pad/progress-tracker#t-8',
    }
    render(
      <ItemList groups={[{ title: undefined, count: 1, rows: [task] }]} onNavigate={onNavigate} />,
    )
    const external = screen.getByRole('link', { name: 'the bank rules' })
    await userEvent.click(screen.getByRole('link', { name: 'the retry limit' }))

    expect([
      screen.getByText(/^Read/u).textContent,
      onNavigate.mock.calls,
      [external.getAttribute('href'), external.getAttribute('target')],
    ]).toStrictEqual([
      'Read the retry limit and the bank rules',
      [['/pad/retry-limit.md']],
      ['https://x.dev/rules', '_blank'],
    ])
  })
})
