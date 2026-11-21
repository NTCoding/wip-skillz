import { type Meta, type StoryObj } from '@storybook/react-vite'
import { TableBlock } from './table-block'

const meta = {
  title: 'Design system/TableBlock',
  component: TableBlock,
  args: {
    children: (
      <>
        <thead>
          <tr>
            <th>Shop</th>
            <th>Invoices</th>
            <th data-align="right">Retries</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Bakery</td>
            <td>
              <code>invoice-2026-03.csv</code>
            </td>
            <td data-align="right">0</td>
          </tr>
          <tr>
            <td>Bike repair</td>
            <td>
              <code>invoice-2026-03.csv</code>
            </td>
            <td data-align="right">3</td>
          </tr>
        </tbody>
      </>
    ),
  },
} satisfies Meta<typeof TableBlock>

export default meta

type Story = StoryObj<typeof meta>

export const ThreeColumns: Story = {}
