import { type Meta, type StoryObj } from '@storybook/react-vite'
import { TaskStateLabel } from './task-state-label'

const meta = {
  title: 'Design system/TaskStateLabel',
  component: TaskStateLabel,
  args: { state: 'to-do' },
} satisfies Meta<typeof TaskStateLabel>

export default meta

type Story = StoryObj<typeof meta>

export const ToDo: Story = {}

export const InProgress: Story = { args: { state: 'in-progress' } }

export const Done: Story = { args: { state: 'done' } }
