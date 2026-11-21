import { type Meta, type StoryObj } from '@storybook/react-vite'
import { TopBar } from './top-bar'

const meta = {
  title: 'Design system/TopBar',
  component: TopBar,
  args: {
    title: 'Invoice export',
    titleHref: '/2026-11-20-invoice-export/',
    onNavigate: () => undefined,
    tabs: <span>The tabs</span>,
    actions: <span>The colour switcher</span>,
  },
} satisfies Meta<typeof TopBar>

export default meta

type Story = StoryObj<typeof meta>

export const WithTabsAndActions: Story = {}
