import { type Meta, type StoryObj } from '@storybook/react-vite'
import { MarginDecision } from './margin-decision'

const meta = {
  title: 'Design system/MarginDecision',
  component: MarginDecision,
  args: {
    id: 'd-1',
    question: 'Will the export job retry 8 times?',
    proposal: 'Raise the retry limit to 8.',
    alternative: 'Keep the retry limit at 5.',
    pick: 'proposal, because the network of a shop can be slow.',
    answer: 'proposal',
    context: ['The network of a small shop can be slow in the evening.'],
    open: false,
    onToggle: () => undefined,
  },
} satisfies Meta<typeof MarginDecision>

export default meta

type Story = StoryObj<typeof meta>

export const Closed: Story = {}

export const Open: Story = { args: { open: true } }

export const WrittenAnswer: Story = {
  args: { open: true, answer: 'Retry 8 times, but only for the shops in the evening.' },
}
