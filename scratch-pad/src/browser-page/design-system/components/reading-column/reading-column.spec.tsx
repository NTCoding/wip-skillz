import { readFileSync } from 'node:fs'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
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
  it('is the same in reading-column.css and in margin-lane.css', () => {
    const query = '@container reading-column (width >= 1040px)'
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
