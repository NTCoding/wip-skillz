import { type Meta, type StoryObj } from '@storybook/react-vite'
import { TopBar } from './top-bar'

const meta = {
  title: 'Design system/TopBar',
  component: TopBar,
  args: {
    title: 'Invoice export',
    titleHref: '/2026-11-20-invoice-export/',
    parents: [],
    current: 'Retry limit',
    onNavigate: () => undefined,
    actions: <span>The Inbox</span>,
  },
} satisfies Meta<typeof TopBar>

export default meta

type Story = StoryObj<typeof meta>

export const WithABreadcrumbAndActions: Story = {}

export const OnTheFirstPage: Story = { args: { current: undefined } }

export const OnAPageWithParents: Story = {
  args: {
    parents: [
      { title: 'Retry limit', href: '/2026-11-20-invoice-export/retry-limit.md' },
      {
        title: 'Wait between retries',
        href: '/2026-11-20-invoice-export/wait-between-retries.md',
      },
    ],
    current: 'First retry',
  },
}
