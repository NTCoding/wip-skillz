import { type Meta, type StoryObj } from '@storybook/react-vite'
import { Notice } from './notice'

const meta = {
  title: 'Design system/Notice',
  component: Notice,
  args: { tone: 'info', children: 'There aren’t any tasks yet.' },
} satisfies Meta<typeof Notice>

export default meta

type Story = StoryObj<typeof meta>

export const Info: Story = {}

export const Warning: Story = {
  args: {
    tone: 'warning',
    children: 'There aren’t any blocks called :::chart. The blocks are :::decision and :::html.',
  },
}
