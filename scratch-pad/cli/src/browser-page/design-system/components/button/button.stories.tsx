import { type Meta, type StoryObj } from '@storybook/react-vite'
import { Button } from './button'

const meta = {
  title: 'Design system/Button',
  component: Button,
  args: { children: 'Retry the export', onClick: () => undefined },
} satisfies Meta<typeof Button>

export default meta

type Story = StoryObj<typeof meta>

export const Quiet: Story = {}

export const Primary: Story = { args: { variant: 'primary', children: 'Send the invoice' } }

export const Disabled: Story = { args: { disabled: true } }
