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
