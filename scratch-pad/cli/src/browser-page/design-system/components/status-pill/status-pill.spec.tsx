import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StatusPill } from './status-pill'

describe('StatusPill', () => {
  it('shows the text as a status when it is rendered', () => {
    render(<StatusPill>The export job has stopped.</StatusPill>)
    expect(screen.getByRole('status').textContent).toBe('The export job has stopped.')
  })
})
