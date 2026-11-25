import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DecisionPageStatus, type DecisionPageState } from './decision-page-status'

describe('DecisionPageStatus', () => {
  it.each([
    ['draft', 'Status: Draft'],
    ['open', 'Status: Open'],
    ['changes-requested', 'Status: Changes requested'],
    ['decided', 'Status: Decided'],
  ] as const satisfies readonly (readonly [DecisionPageState, string])[])(
    'shows the label of the %s state',
    (state, text) => {
      const { container } = render(<DecisionPageStatus state={state} />)
      expect(container.textContent).toBe(text)
      expect(container.firstElementChild?.getAttribute('data-state')).toBe(state)
    },
  )
})
