import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DecisionLog } from './decision-log'

describe('DecisionLog', () => {
  it('shows the number, the time, the source and the text of each entry when it is rendered', () => {
    render(
      <DecisionLog
        entries={[
          {
            number: 1,
            time: '2026-11-20T09:30:00.000Z',
            source: 'chat',
            text: 'The export job runs every night.',
            decision: undefined,
          },
          {
            number: 2,
            time: '2026-11-20T10:05:00.000Z',
            source: 'page',
            text: 'Nick chose: proposal',
            decision: 'd-1',
          },
        ]}
      />,
    )
    const entries = screen.getAllByRole('listitem').map((entry) => entry.textContent)
    expect(entries).toStrictEqual([
      '120 Nov 2026, 09:30In the chatThe export job runs every night.',
      '220 Nov 2026, 10:05On a paged-1Nick chose: proposal',
    ])
  })
})
