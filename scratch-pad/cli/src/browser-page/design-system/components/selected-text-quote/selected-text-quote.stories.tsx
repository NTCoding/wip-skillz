import { type Meta, type StoryObj } from '@storybook/react-vite'
import { SelectedTextQuote } from './selected-text-quote'

const meta = {
  title: 'Design system/SelectedTextQuote',
  component: SelectedTextQuote,
  args: {
    quote: {
      prefix: 'The export job ',
      selectedText: 'retries 5 times',
      suffix: ' on a slow network.',
    },
    kind: 'comment',
  },
} satisfies Meta<typeof SelectedTextQuote>

export default meta

type Story = StoryObj<typeof meta>

export const Comment: Story = {}

export const GrammarNote: Story = { args: { kind: 'grammar' } }
