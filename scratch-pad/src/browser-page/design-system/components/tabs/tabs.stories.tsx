import { type Meta, type StoryObj } from '@storybook/react-vite'
import { Tabs } from './tabs'

const meta = {
  title: 'Design system/Tabs',
  component: Tabs,
  args: {
    label: 'Views of the scratch pad',
    onNavigate: () => undefined,
    tabs: [
      { label: 'Pages', href: '/pad/', icon: 'page', current: true },
      {
        label: 'Progress tracker',
        href: '/pad/progress-tracker',
        icon: 'progress-tracker',
        current: false,
      },
      { label: 'Decisions', href: '/pad/decisions', icon: 'decision', current: false },
    ],
  },
} satisfies Meta<typeof Tabs>

export default meta

type Story = StoryObj<typeof meta>

export const PagesCurrent: Story = {}
