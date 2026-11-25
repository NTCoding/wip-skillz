import { type Meta, type StoryObj } from '@storybook/react-vite'
import { DecisionCard } from '../decision-card/decision-card'
import { DecisionAnswerForm } from './decision-answer-form'

const meta = {
  title: 'Design system/DecisionAnswerForm',
  component: DecisionAnswerForm,
  args: { onAnswer: () => Promise.resolve() },
  decorators: [
    (story) => (
      <DecisionCard
        id="d-1"
        question="Will the export job retry 8 times?"
        context="A slow network in the evening can make an upload fail."
        proposal="Raise the retry limit to 8."
        alternative="Keep the retry limit at 5."
        pick="The proposal, because the network of a shop can be slow."
        answer={undefined}
      >
        {story()}
      </DecisionCard>
    ),
  ],
} satisfies Meta<typeof DecisionAnswerForm>

export default meta

type Story = StoryObj<typeof meta>

export const InADecisionBlock: Story = {}

export const WithTheButtonToRequestChanges: Story = {
  args: { onRequestChanges: () => Promise.resolve() },
}

export const WithLongOptionLabels: Story = {
  args: {
    options: [
      {
        choice: 'option-1',
        label: 'Option 1: Wait 30 seconds before each retry and give up after 8 retries',
      },
      {
        choice: 'option-2',
        label: 'Option 2: Double the wait after each failed retry until the wait is 10 minutes',
      },
      { choice: 'option-3', label: 'Option 3: Stop retrying' },
    ],
  },
}
