import { type Meta, type StoryObj } from '@storybook/react-vite'
import { TaskLink } from './task-link'

const meta = {
  title: 'Design system/TaskLink',
  component: TaskLink,
  args: {
    href: '#t-4',
    onNavigate: () => undefined,
    children: '2.1 Retry a failed export',
  },
} satisfies Meta<typeof TaskLink>

export default meta

type Story = StoryObj<typeof meta>

export const ToATask: Story = {}

// A reference to a task that isn't on the progress tracker is shown as its text.
export const ToAMissingTask: Story = { args: { href: undefined, children: 'task:t-9' } }
