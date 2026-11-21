import { type Meta, type StoryObj } from '@storybook/react-vite'
import { ColourSwitcher } from './colour-switcher'

const meta = {
  title: 'Design system/ColourSwitcher',
  component: ColourSwitcher,
  args: { mode: 'light', onChange: () => undefined },
} satisfies Meta<typeof ColourSwitcher>

export default meta

type Story = StoryObj<typeof meta>

export const Light: Story = {}

export const Dark: Story = { args: { mode: 'dark' } }
