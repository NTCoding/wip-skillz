import { type Meta, type StoryObj } from '@storybook/react-vite'
import { OutboxMessage } from './outbox-message'

const meta = {
  title: 'Design system/OutboxMessage',
  component: OutboxMessage,
  args: {
    label: 'Comment',
    text: 'Is 5 retries enough on a slow network?',
    time: '2026-11-20T21:09:00.000Z',
    shownTime: '20 Nov, 21:09',
    onEdit: () => Promise.resolve(),
    onRemove: () => Promise.resolve(),
    onEditingChange: () => undefined,
  },
} satisfies Meta<typeof OutboxMessage>

export default meta

type Story = StoryObj<typeof meta>

export const QueuedComment: Story = {}

export const QueuedReply: Story = {
  args: { label: 'Reply', text: 'Can a shop ask for 8 retries instead?' },
}
