import { type Meta, type StoryObj } from '@storybook/react-vite'
import { HtmlBlock } from './html-block'

const meta = {
  title: 'Design system/HtmlBlock',
  component: HtmlBlock,
  args: {
    onNavigate: () => undefined,
    onComment: () => undefined,
    html: [
      '<div style="display:flex;gap:var(--space-md)">',
      '<p style="padding:var(--space-md);border-radius:var(--r-md);background:var(--accent-pale);color:var(--state-done)">Read the paid invoices</p>',
      '<p style="padding:var(--space-md);border-radius:var(--r-md);background:var(--tint);color:var(--text)">Write one CSV file per shop</p>',
      '</div>',
    ].join(''),
  },
} satisfies Meta<typeof HtmlBlock>

export default meta

type Story = StoryObj<typeof meta>

export const StepsThatUseTokens: Story = {}

export const WithoutServer: Story = { args: { frameSource: 'inline' } }
