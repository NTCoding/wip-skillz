import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ThreadKind, threadKindNames } from './thread-kind'

describe('ThreadKind', () => {
  it('shows the label of a grammar note with its colour when the kind is grammar', () => {
    render(<ThreadKind kind="grammar" />)
    const label = screen.getByText('Grammar / tone')
    expect(label.getAttribute('data-kind')).toBe('grammar')
    expect(label.querySelector('svg')).not.toBeNull()
  })

  it('lists the 3 kinds in the order of the selection tools when the kinds are read', () => {
    expect(threadKindNames).toStrictEqual(['comment', 'grammar', 'improvement'])
  })
})
