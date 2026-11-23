import { type Meta, type StoryObj } from '@storybook/react-vite'
import { TaskList } from './task-list'

const meta = {
  title: 'Design system/TaskList',
  component: TaskList,
  args: {
    tasks: [
      { id: 't-1', number: '1', title: 'Design the export job', state: 'done' },
      { id: 't-2', number: '2', title: 'Write the invoice template', state: 'in-progress' },
      { id: 't-3', number: '3', title: 'Check the retry limit', state: 'to-do' },
    ],
  },
} satisfies Meta<typeof TaskList>

export default meta

type Story = StoryObj<typeof meta>

export const ThreeStates: Story = {}

// The titles of the first 2 tasks link to their descriptions, whereas the last task doesn't have a
// description.
export const TitlesWithDescriptions: Story = {
  args: {
    tasks: [
      { id: 't-1', number: '1', title: 'Design the export job', state: 'done', href: '#t-1' },
      {
        id: 't-2',
        number: '2',
        title: 'Write the invoice template',
        state: 'in-progress',
        href: '#t-2',
      },
      { id: 't-3', number: '3', title: 'Check the retry limit', state: 'to-do' },
    ],
    onNavigate: () => undefined,
  },
}

// The task in progress shows its subtasks, whereas the subtasks of the last task are hidden
// until Nick clicks its chevron.
export const Subtasks: Story = {
  args: {
    tasks: [
      { id: 't-1', number: '1', title: 'Design the export job', state: 'done' },
      {
        id: 't-2',
        number: '2',
        title: 'Build the export job',
        state: 'in-progress',
        subtasks: [
          { id: 't-4', number: '2.1', title: 'Retry a failed export', state: 'done' },
          { id: 't-5', number: '2.2', title: 'Log each retry', state: 'in-progress' },
          { id: 't-6', number: '2.3', title: 'Alert the team', state: 'to-do' },
        ],
      },
      {
        id: 't-3',
        number: '3',
        title: 'Ship the export job',
        state: 'to-do',
        subtasks: [{ id: 't-7', number: '3.1', title: 'Tell the shops', state: 'to-do' }],
      },
    ],
  },
}
