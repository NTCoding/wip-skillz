import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ReadingColumn } from './reading-column'

describe('ReadingColumn', () => {
  it('puts the text of the page in an article when it is rendered', () => {
    render(
      <ReadingColumn>
        <h1>Invoice export</h1>
      </ReadingColumn>,
    )
    expect(screen.getByRole('article').textContent).toBe('Invoice export')
  })
})

describe('ReadingColumn with a margin', () => {
  it('shows the margin beside the text and marks the column as the scope of the anchors', () => {
    const { container } = render(
      <ReadingColumn margin={<aside aria-label="Comments and notes" />}>
        <p data-lines="3-3">The export job retries 5 times.</p>
      </ReadingColumn>,
    )
    expect(screen.getByRole('complementary', { name: 'Comments and notes' })).toBeDefined()
    expect(container.firstElementChild?.getAttribute('data-margin-scope')).toBe('true')
  })
})
