import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FilterPills } from './filter-pills'

const pills = [
  { value: 'all', label: 'All', count: 3 },
  { value: 'resolved', label: 'Resolved', count: 1 },
] as const

describe('FilterPills', () => {
  it('shows each filter with its count and presses the selected filter', () => {
    render(<FilterPills label="Show" pills={pills} selected="all" onSelect={() => undefined} />)
    expect(
      screen
        .getAllByRole('button')
        .map((pill) => [pill.textContent, pill.getAttribute('aria-pressed')]),
    ).toStrictEqual([
      ['All3', 'true'],
      ['Resolved1', 'false'],
    ])
    expect(screen.getByRole('group', { name: 'Show' }).childElementCount).toBe(2)
  })

  it('calls onSelect with the value of the filter that Nick clicks', async () => {
    const onSelect = vi.fn<(value: 'all' | 'resolved') => void>()
    render(<FilterPills label="Show" pills={pills} selected="all" onSelect={onSelect} />)
    await userEvent.click(screen.getByRole('button', { name: /^Resolved/ }))
    expect(onSelect).toHaveBeenCalledWith('resolved')
  })
})
