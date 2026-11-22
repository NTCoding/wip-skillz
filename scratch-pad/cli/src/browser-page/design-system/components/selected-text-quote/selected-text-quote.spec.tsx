import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SelectedTextQuote } from './selected-text-quote'

describe('SelectedTextQuote', () => {
  it('quotes the text around the selected text and highlights the selected text in the colour of its kind', () => {
    render(
      <SelectedTextQuote
        quote={{ prefix: 'The job ', selectedText: 'retries 5 times', suffix: ' at night.' }}
        kind="grammar"
      />,
    )
    const quote = screen.getByRole('blockquote')
    expect(quote.textContent).toBe('The job retries 5 times at night.')
    expect(screen.getByText('retries 5 times').getAttribute('data-kind')).toBe('grammar')
  })

  it.each([
    [
      'The job',
      'retries 5 times',
      'on a slow network.',
      'The job retries 5 times on a slow network.',
    ],
    ['The job (', '5 times', '). It stops.', 'The job (5 times). It stops.'],
    [undefined, 'Retries', ', at night', 'Retries, at night'],
    ['The job ', 'retries', undefined, 'The job retries'],
    ['', 'Retries', '', 'Retries'],
  ])(
    'puts a space back between the prefix %j, the selected text %j and the suffix %j only where the text needs one',
    (prefix, selectedText, suffix, shown) => {
      render(<SelectedTextQuote quote={{ prefix, selectedText, suffix }} kind="comment" />)
      expect(screen.getByRole('blockquote').textContent).toBe(shown)
    },
  )
})
