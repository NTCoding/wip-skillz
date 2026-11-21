import { type Meta, type StoryObj } from '@storybook/react-vite'
import { IconButton } from './icon-button'

const meta = {
  title: 'Design system/IconButton',
  component: IconButton,
  args: { icon: 'full-size', label: 'Open the table at full size', onClick: () => undefined },
} satisfies Meta<typeof IconButton>

export default meta

type Story = StoryObj<typeof meta>

export const OnThePage: Story = {}

export const Pressed: Story = {
  args: { icon: 'sidebar-collapse', label: 'Collapse the sidebar', pressed: true },
}

export const OnACodeBlock: Story = { args: { tone: 'code', icon: 'copy', label: 'Copy the code' } }
