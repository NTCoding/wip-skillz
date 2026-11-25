import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { exportPadAddresses, decisionLog, pageSummaries } from './browser-page-fixtures'
import { decisionsOfPad } from './decision-fixtures'
import { DecisionsView } from './decisions-view'
import { type DecisionsOfPad } from './api-responses'

function renderView(decisions: DecisionsOfPad = decisionsOfPad, onNavigate = vi.fn()) {
  render(
    <DecisionsView
      addresses={exportPadAddresses}
      pages={pageSummaries}
      entries={decisionLog}
      decisions={decisions}
      onNavigate={onNavigate}
    />,
  )
  return onNavigate
}

function pressed(): string[] {
  return screen
    .getAllByRole('button')
    .filter((button) => button.getAttribute('aria-pressed') === 'true')
    .map((button) => button.textContent)
}

describe('DecisionsView', () => {
  it('shows a button for each state with its count and no button for all of them', () => {
    renderView()
    const buttons = within(screen.getByRole('group', { name: 'Show' })).getAllByRole('button')
    expect(buttons.map((button) => button.textContent)).toStrictEqual([
      'Open1',
      'Changes requested1',
      'Decided1',
    ])
  })

  it('selects Open when Nick opens the page and lists only the decisions that wait for him', () => {
    renderView()
    expect(pressed()).toStrictEqual(['Open1'])
    expect(screen.getByText('Will the export job retry 8 times?')).toBeDefined()
    expect(screen.queryByText('The export job runs every night.')).toBeNull()
  })

  it('lists the decisions with changes requested with the reason of Nick when Nick presses the button', async () => {
    renderView()
    await userEvent.click(screen.getByRole('button', { name: /^Changes requested/ }))
    expect(pressed()).toStrictEqual(['Changes requested1'])
    expect(screen.getByText('Will the invoice show the tax number?')).toBeDefined()
    expect(screen.getByText("Nick: The options don't say who the team is.")).toBeDefined()
  })

  it('lists the decisions with changes requested with the newest first', async () => {
    const review = {
      page: 'pages/index.md',
      line: 3,
      round: 1,
      reason: 'Who is the team?',
      outcome: undefined,
    }
    renderView({
      open: [],
      reviews: [
        { ...review, id: 'd-3', question: 'The older one?', time: '2026-11-20T10:00:00.000Z' },
        { ...review, id: 'd-4', question: 'The newer one?', time: '2026-11-22T10:00:00.000Z' },
      ],
    })
    await userEvent.click(screen.getByRole('button', { name: /^Changes requested/ }))

    expect(
      screen
        .getAllByRole('listitem')
        .map((row) => row.querySelector('.item-list__quote')?.textContent),
    ).toStrictEqual(['The newer one?', 'The older one?'])
  })

  it('shows the log of decisions when Nick presses Decided', async () => {
    renderView()
    await userEvent.click(screen.getByRole('button', { name: /^Decided/ }))
    expect(screen.getByText('The export job runs every night.')).toBeDefined()
  })

  it('opens the page of the decision when Nick follows the link of a row', async () => {
    const onNavigate = renderView()
    await userEvent.click(screen.getByRole('link', { name: /Open the decision/ }))
    expect(onNavigate).toHaveBeenCalledWith(`${exportPadAddresses.pageHref('index.md', 'd-1')}`)
  })

  it('shows the reason and the line of the agent on a decision that the agent has reopened', () => {
    renderView({
      open: decisionsOfPad.open,
      reviews: [
        {
          id: 'd-1',
          page: 'pages/index.md',
          line: 28,
          question: 'Will the export job retry 8 times?',
          round: 1,
          reason: 'Who is the team?',
          outcome: 'Added who the team is.',
          time: '2026-11-22T10:00:00.000Z',
        },
      ],
    })
    expect(screen.getByText('Reopened by the agent')).toBeDefined()
    expect(screen.getByText('Nick: Who is the team?')).toBeDefined()
    expect(screen.getByText('The agent: Added who the team is.')).toBeDefined()
  })

  it.each([
    ['Open', 'There aren’t any open decisions.'],
    ['Changes requested', 'There aren’t any decisions with changes requested.'],
  ])('says that there aren’t any decisions when the %s button has none', async (name, text) => {
    renderView({ open: [], reviews: [] })
    await userEvent.click(screen.getByRole('button', { name: new RegExp(`^${name}`) }))
    expect(screen.getByRole('status').textContent).toBe(text)
  })

  it('says that the log is empty when Nick presses Decided and there is not any entry', async () => {
    render(
      <DecisionsView
        addresses={exportPadAddresses}
        pages={pageSummaries}
        entries={[]}
        decisions={decisionsOfPad}
        onNavigate={vi.fn()}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: /^Decided/ }))
    expect(screen.getByRole('status').textContent).toBe(
      'There aren’t any decisions in the log yet.',
    )
  })
})
