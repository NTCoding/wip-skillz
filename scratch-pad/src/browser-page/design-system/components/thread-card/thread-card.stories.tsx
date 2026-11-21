import { type Meta, type StoryObj } from '@storybook/react-vite'
import { ThreadCard, type ThreadMessage } from './thread-card'

const question: ThreadMessage = {
  author: 'nick',
  text: 'Is 5 retries enough on a slow network?',
  time: '2026-11-20T21:09:00.000Z',
  shownTime: '20 Nov, 21:09',
}

const answer: ThreadMessage = {
  author: 'agent',
  text: 'I have raised the limit to 8 retries and added the wait time.',
  time: '2026-11-20T21:12:00.000Z',
  shownTime: '20 Nov, 21:12',
}

const meta = {
  title: 'Design system/ThreadCard',
  component: ThreadCard,
  args: {
    id: 'c-1',
    kind: 'comment',
    messages: [question],
    state: 'waits-for-agent',
    outcome: undefined,
    textChanged: false,
    active: false,
    onActivate: () => undefined,
    onReply: () => Promise.resolve(),
    onResolve: () => Promise.resolve(),
  },
} satisfies Meta<typeof ThreadCard>

export default meta

type Story = StoryObj<typeof meta>

export const SentToTheAgent: Story = {}

export const TheAgentReplied: Story = {
  args: { messages: [question, answer], state: 'waits-for-nick', active: true },
}

export const GrammarNote: Story = {
  args: {
    id: 'g-1',
    kind: 'grammar',
    messages: [{ ...question, text: 'Write who will change the template rather than "it".' }],
  },
}

export const ImprovementNoteDone: Story = {
  args: {
    id: 'i-1',
    kind: 'improvement',
    messages: [{ ...question, text: 'Add an example of a failed export.' }],
    state: 'resolved',
    outcome: 'Added an example of an export that failed on the third retry.',
  },
}

export const TextHasChanged: Story = { args: { textChanged: true } }

export const ReadOnly: Story = {
  args: { messages: [question, answer], state: 'waits-for-nick' },
  render: (args) => <ThreadCard {...args} onReply={undefined} onResolve={undefined} />,
}

export const ResolvedWithReplies: Story = {
  args: { messages: [question, answer], state: 'resolved', textChanged: true },
}
