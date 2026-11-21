import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { TableBlock } from './table-block'

function renderTable() {
  render(
    <TableBlock>
      <tbody>
        <tr>
          <td>Bakery</td>
          <td>5 retries</td>
        </tr>
      </tbody>
    </TableBlock>,
  )
}

describe('TableBlock', () => {
  it('renders the rows in a table when it is rendered', () => {
    renderTable()
    expect(screen.getByRole('table').textContent).toBe('Bakery5 retries')
  })

  it('opens the table at full size when Nick presses the control', async () => {
    renderTable()
    await userEvent.click(screen.getByRole('button', { name: 'Open the table at full size' }))
    expect(screen.getByRole('dialog', { name: 'table' }).textContent).toContain('Bakery')
  })
})
