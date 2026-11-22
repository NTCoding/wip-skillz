import { type Meta, type StoryObj } from '@storybook/react-vite'
import { MessageBox } from './message-box'

const meta = {
  title: 'Design system/MessageBox',
  component: MessageBox,
  args: { label: 'Write a reply…', submitLabel: 'Reply', onSubmit: () => Promise.resolve() },
} satisfies Meta<typeof MessageBox>

export default meta

type Story = StoryObj<typeof meta>

export const Reply: Story = {}

export const WithCancel: Story = {
  args: { label: 'Write a comment…', submitLabel: 'Send', onCancel: () => undefined },
}

export const WithOutbox: Story = {
  args: {
    label: 'Write a comment…',
    submitLabel: 'Send',
    onCancel: () => undefined,
    secondSubmit: { label: 'Add to outbox', onSubmit: () => Promise.resolve() },
    initialText: 'Is 5 retries enough on a slow network?',
  },
}
