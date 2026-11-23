import { type Meta, type StoryObj } from '@storybook/react-vite'
import { TaskChips } from './task-chips'

const meta = {
  title: 'Design system/TaskChips',
  component: TaskChips,
  args: {
    tasks: [{ id: 't-4', label: '2.1 Retry a failed export', href: '#t-4', state: 'done' }],
    onNavigate: () => undefined,
  },
} satisfies Meta<typeof TaskChips>

export default meta

type Story = StoryObj<typeof meta>

export const OneTask: Story = {}

// A page that the descriptions of 2 tasks link to shows 2 chips.
export const TwoTasks: Story = {
  args: {
    tasks: [
      { id: 't-4', label: '2.1 Retry a failed export', href: '#t-4', state: 'done' },
      { id: 't-6', label: '3 Ship the export job', href: '#t-6', state: 'in-progress' },
    ],
  },
}
