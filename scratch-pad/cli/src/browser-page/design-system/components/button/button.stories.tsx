import { type Meta, type StoryObj } from '@storybook/react-vite'
import { Button } from './button'

const meta = {
  title: 'Design system/Button',
  component: Button,
  args: { children: 'Retry the export', onClick: () => undefined },
} satisfies Meta<typeof Button>

export default meta

type Story = StoryObj<typeof meta>

export const Quiet: Story = {}

export const Primary: Story = { args: { variant: 'primary', children: 'Send the invoice' } }

export const Disabled: Story = { args: { disabled: true } }

// The button that adds a reply to the outbox, whose name for a screen reader is its label
export const WithIcon: Story = {
  args: { icon: 'plus', label: 'Add to outbox', children: 'Outbox' },
}

// The button that marks a task as done in the Inbox
export const Small: Story = { args: { size: 'small', children: 'Mark as done' } }

// A button whose request is pending ignores a press. The focus stays on the button.
export const Pending: Story = { args: { size: 'small', pending: true, children: 'Mark as done' } }
