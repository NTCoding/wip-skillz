import { type Meta, type StoryObj } from '@storybook/react-vite'
import { TaskList } from './task-list'

const meta = {
  title: 'Design system/TaskList',
  component: TaskList,
  args: {
    tasks: [
      { number: 1, title: 'Design the export job', state: 'done' },
      { number: 2, title: 'Write the invoice template', state: 'in-progress' },
      { number: 3, title: 'Check the retry limit', state: 'to-do' },
    ],
  },
} satisfies Meta<typeof TaskList>

export default meta

type Story = StoryObj<typeof meta>

export const ThreeStates: Story = {}
