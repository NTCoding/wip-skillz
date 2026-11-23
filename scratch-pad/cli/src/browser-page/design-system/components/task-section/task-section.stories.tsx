import { type Meta, type StoryObj } from '@storybook/react-vite'
import { TaskSection } from './task-section'

const meta = {
  title: 'Design system/TaskSection',
  component: TaskSection,
  args: {
    id: 't-2',
    level: 2,
    title: '2. Build the export job',
    open: false,
    children: <p>The job writes one CSV file per shop every night.</p>,
  },
} satisfies Meta<typeof TaskSection>

export default meta

type Story = StoryObj<typeof meta>

export const Collapsed: Story = {}

// The section of a task with the open section of one of its subtasks
export const OpenWithASubtask: Story = {
  args: {
    open: true,
    children: (
      <>
        <p>The job writes one CSV file per shop every night.</p>
        <TaskSection id="t-4" level={3} title="2.1 Retry a failed export" open>
          <p>A failed export is tried again 8 times.</p>
        </TaskSection>
      </>
    ),
  },
}
