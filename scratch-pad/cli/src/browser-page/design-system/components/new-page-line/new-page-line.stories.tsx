import { type Meta, type StoryObj } from '@storybook/react-vite'
import { NewPageLine } from './new-page-line'

const meta = {
  title: 'Design system/NewPageLine',
  component: NewPageLine,
  args: { onMarkAsRead: () => Promise.resolve() },
} satisfies Meta<typeof NewPageLine>

export default meta

type Story = StoryObj<typeof meta>

export const New: Story = {}
