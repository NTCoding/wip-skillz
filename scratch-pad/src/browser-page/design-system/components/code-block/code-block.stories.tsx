import { type Meta, type StoryObj } from '@storybook/react-vite'
import { CodeBlock } from './code-block'

const meta = {
  title: 'Design system/CodeBlock',
  component: CodeBlock,
  args: {
    language: 'ts',
    code: [
      '// The export job retries a failed shop 5 times.',
      'export const retryLimit = 5',
      '',
      'export async function exportShop(shop: Shop): Promise<ExportResult> {',
      "  const invoices = await paidInvoices(shop.id, 'EUR')",
      '  return writeCsv(invoices)',
      '}',
    ].join('\n'),
  },
} satisfies Meta<typeof CodeBlock>

export default meta

type Story = StoryObj<typeof meta>

export const TypeScript: Story = {}

export const Shell: Story = {
  args: { language: 'sh', code: '# Run the export for one shop\nscratch-pad export --shop 42' },
}

export const WithoutALanguage: Story = {
  args: { language: undefined, code: 'retry limit: 5\nwait between retries: 30 seconds' },
}
