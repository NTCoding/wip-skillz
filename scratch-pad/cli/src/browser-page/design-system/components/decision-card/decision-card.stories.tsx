import { type Meta, type StoryObj } from '@storybook/react-vite'
import { DecisionCard } from './decision-card'

const meta = {
  title: 'Design system/DecisionCard',
  component: DecisionCard,
  args: {
    id: 'd-1',
    question: 'Will the export job retry 8 times?',
    context: undefined,
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

export const ChangesRequested: Story = {
  args: { reviews: [{ reason: "The options don't say who the team is.", outcome: undefined }] },
}

export const Reopened: Story = {
  args: {
    reviews: [
      {
        reason: "The options don't say who the team is.",
        outcome: 'Added who the team is to both options.',
      },
    ],
  },
}

export const SecondRoundOfChangesRequested: Story = {
  args: {
    reviews: [
      {
        reason: "The options don't say who the team is.",
        outcome: 'Added who the team is to both options.',
      },
      { reason: 'Say which person on the team reads the log.', outcome: undefined },
    ],
  },
}

export const WithContext: Story = {
  args: {
    context: (
      <>
        <p>A slow network in the evening can make an upload fail. Read these in order:</p>
        <ol>
          <li>
            <a href="#how-the-job-runs">How the job runs</a> shows where the upload happens.
          </li>
          <li>
            <a href="#retry-limit">The retry limit</a> explains why the limit is 5 today.
          </li>
        </ol>
      </>
    ),
  },
}
