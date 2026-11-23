import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SectionChange } from './section-change'

describe('SectionChange', () => {
  it('says when the agent changed the section and doesn’t show a button to mark the section as read', () => {
    render(
      <SectionChange
        title="Retry limit"
        shownTime="20 Nov, 21:42"
        active={false}
        problem={undefined}
      />,
    )
    const card = screen.getByRole('region', { name: 'Retry limit has changed' })
    expect(card.textContent).toBe(
      'This section has changedThe agent changed this section at 20 Nov, 21:42, after you last read it.',
    )
    expect(screen.queryByRole('button', { name: 'Mark as read' })).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('shows the problem when the section couldn’t be marked as read', () => {
    render(
      <SectionChange
        title="Retry limit"
        shownTime="20 Nov, 21:42"
        active={false}
        problem="There isn’t any section retry-limit on index.md."
      />,
    )
    expect(screen.getByRole('alert').textContent).toBe(
      'There isn’t any section retry-limit on index.md.',
    )
  })
})
