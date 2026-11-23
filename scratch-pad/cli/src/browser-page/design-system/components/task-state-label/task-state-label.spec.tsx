import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TaskStateLabel } from './task-state-label'

describe('TaskStateLabel', () => {
  it.each([
    ['to-do', 'To do'],
    ['in-progress', 'In progress'],
    ['done', 'Done'],
  ] as const)('shows the label of the state %s', (state, label) => {
    expect(render(<TaskStateLabel state={state} />).container.textContent).toBe(label)
  })
})
