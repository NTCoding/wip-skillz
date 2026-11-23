import { readFileSync } from 'node:fs'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { wideReadingColumn } from '../margin-lane/margin-lane'
import { ReadingColumn } from './reading-column'
import readingColumnCss from './reading-column.css?raw'

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

describe('ReadingColumn with an end', () => {
  it('shows the end under the last block of the text when an end is given', () => {
    render(
      <ReadingColumn end={<p>The pages of the invoice export</p>}>
        <p>The export job retries 5 times.</p>
      </ReadingColumn>,
    )
    expect(screen.getByRole('article').lastElementChild?.textContent).toBe(
      'The pages of the invoice export',
    )
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

describe('the width where the lane replaces the markers', () => {
  it('is the same in reading-column.css, in margin-lane.css and in margin-lane.tsx', () => {
    const query = `@container reading-column (width >= ${wideReadingColumn}px)`
    const marginLaneCss = readFileSync(
      'src/browser-page/design-system/components/margin-lane/margin-lane.css',
      'utf8',
    )
    expect([readingColumnCss.includes(query), marginLaneCss.includes(query)]).toStrictEqual([
      true,
      true,
    ])
  })
})
