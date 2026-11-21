import { type Meta, type StoryObj } from '@storybook/react-vite'
import { DecisionCard } from './decision-card'

const meta = {
  title: 'Design system/DecisionCard',
  component: DecisionCard,
  args: {
    id: 'd-1',
    question: 'Will the export job retry 8 times?',
    proposal: 'Raise the retry limit to 8.',
    alternative: 'Keep the retry limit at 5.',
    pick: 'The proposal, because the network of a shop can be slow.',
    answer: undefined,
  },
} satisfies Meta<typeof DecisionCard>

export default meta

type Story = StoryObj<typeof meta>

export const WaitingForNick: Story = {}

export const Answered: Story = { args: { answer: 'proposal' } }
