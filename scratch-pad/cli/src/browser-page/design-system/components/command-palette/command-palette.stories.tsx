import { type Meta, type StoryObj } from '@storybook/react-vite'
import { CommandPalette, type CommandPaletteResult } from './command-palette'

const retryResults: CommandPaletteResult[] = [
  {
    key: 'invoice-export 1',
    place: 'Invoice export › Invoice export',
    snippet:
      '…shows the tax number of each shop. The [retry limit](retry-limit.md) sets how often.',
    matches: [{ start: 41, end: 46 }],
  },
  {
    key: 'invoice-export 2',
    place: 'Invoice export › The code for one shop',
    snippet: 'return uploadCsv(shop, toCsv(invoices), { retries: retryLimit })',
    matches: [{ start: 51, end: 56 }],
  },
  {
    key: 'retry-limit 1',
    place: 'Retry limit › Retry limit',
    snippet:
      'The export job retries a failed shop 5 times. Each retry waits twice as long as the retry before it.',
    matches: [
      { start: 51, end: 56 },
      { start: 84, end: 89 },
    ],
  },
]

const meta = {
  title: 'Design system/CommandPalette',
  component: CommandPalette,
  args: {
    label: 'Search the pages',
    open: true,
    query: 'retry',
    results: retryResults,
    selected: 2,
    onQueryChange: () => undefined,
    onSelect: () => undefined,
    onChoose: () => undefined,
    onClose: () => undefined,
  },
} satisfies Meta<typeof CommandPalette>

export default meta

type Story = StoryObj<typeof meta>

export const Results: Story = {}

export const NoResults: Story = {
  args: { query: 'refund', results: [], selected: 0, queryWithoutResults: 'refund' },
}

export const EmptyField: Story = { args: { query: '', results: [], selected: 0 } }

export const MoreResultsThanFit: Story = {
  args: {
    results: Array.from({ length: 30 }, (_, index) => ({
      key: `wait ${String(index)}`,
      place: `Wait between retries › Retry ${String(index + 1)}`,
      snippet: `Retry ${String(index + 1)} waits twice as long as the retry before it.`,
      matches: [
        { start: 0, end: 5 },
        { start: 46, end: 51 },
      ],
    })),
    selected: 20,
  },
}
