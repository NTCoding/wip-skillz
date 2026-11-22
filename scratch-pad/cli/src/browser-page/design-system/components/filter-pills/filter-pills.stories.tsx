import { type Meta, type StoryObj } from '@storybook/react-vite'
import { FilterPills } from './filter-pills'

const meta = {
  title: 'Design system/FilterPills',
  component: FilterPills,
  args: {
    label: 'Show',
    pills: [
      { value: 'all', label: 'All', count: 6 },
      { value: 'waiting-for-nick', label: 'Waiting for you', count: 3 },
      { value: 'waiting-for-agent', label: 'Waiting for the agent', count: 2 },
      { value: 'resolved', label: 'Resolved', count: 1 },
    ],
    selected: 'all',
    onSelect: () => undefined,
  },
} satisfies Meta<typeof FilterPills>

export default meta

type Story = StoryObj<typeof meta>

export const AllSelected: Story = {}

export const OneFilterSelected: Story = { args: { selected: 'waiting-for-agent' } }
