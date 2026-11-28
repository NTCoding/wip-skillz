import type { Meta, StoryObj } from '@storybook/react-vite'
import { DraftToggle } from './draft-toggle'

const meta: Meta<typeof DraftToggle> = {
  title: 'Design system/DraftToggle',
  component: DraftToggle,
  args: {
    onChange: () => undefined,
  },
}

export default meta

type Story = StoryObj<typeof DraftToggle>

export const Off: Story = {
  args: { enabled: false },
}

export const On: Story = {
  args: { enabled: true },
}
