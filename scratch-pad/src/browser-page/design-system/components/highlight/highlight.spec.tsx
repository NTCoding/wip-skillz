import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Highlight } from './highlight'

describe('Highlight', () => {
  it('marks the text with the ids of its threads when 2 threads share the text', () => {
    render(
      <Highlight threads={['c-1', 'g-2']} kind="grammar" active>
        retries 5 times
      </Highlight>,
    )
    const mark = screen.getByText('retries 5 times')
    expect(mark.tagName).toBe('MARK')
    expect(mark.getAttribute('data-highlight')).toBe('c-1 g-2')
    expect(mark.getAttribute('data-active')).toBe('true')
  })
})
