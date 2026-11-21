import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LinkPreview } from './link-preview'

describe('LinkPreview', () => {
  it('shows the title, the path and the paragraphs of the page when it is rendered', () => {
    render(
      <LinkPreview
        id="preview"
        title="Invoice template"
        path="Invoice export / Invoice template"
        paragraphs={[
          { text: 'Tax number', heading: true },
          { text: 'Each invoice shows the tax number.', heading: false },
        ]}
      />,
    )
    const preview = screen.getByRole('tooltip')
    expect(preview.textContent).toBe(
      'Invoice templateInvoice export / Invoice templateTax numberEach invoice shows the tax number.',
    )
    expect(screen.getByText('Tax number').getAttribute('data-heading')).toBe('true')
    expect(
      screen.getByText('Each invoice shows the tax number.').getAttribute('data-heading'),
    ).toBeNull()
  })
})
