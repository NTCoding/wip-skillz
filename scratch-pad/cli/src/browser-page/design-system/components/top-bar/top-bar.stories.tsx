import { type Meta, type StoryObj } from '@storybook/react-vite'
import { userEvent, within } from 'storybook/test'
import { type FullTreeNode } from '../full-tree/full-tree'
import { TopBar } from './top-bar'

function node(kind: FullTreeNode['kind'], title: string, children: readonly FullTreeNode[] = []) {
  return { kind, title, href: `#${title}`, children }
}

const retryLimit = node('page', '1 Retry limit', [
  node('section', 'Why 5 retries', [
    node('section', 'A small shop'),
    node('section', 'A big shop'),
  ]),
  node('section', 'Wait between retries'),
  node('page', '1.1 Wait between retries', [
    node('section', 'Why the wait doubles'),
    node('page', '1.1.1 First retry', [
      node('section', 'Why 30 seconds'),
      node('page', '1.1.1.1 Wait for the queue'),
    ]),
  ]),
])

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

export const WithTheSubtreeOfTheCurrentPage: Story = {
  args: {
    parents: [{ title: 'Retry limit', href: '/2026-11-20-invoice-export/retry-limit.md' }],
    current: 'Wait between retries',
    subtree: { root: retryLimit, currentHref: '#1.1 Wait between retries' },
  },
  play: async ({ canvasElement }) => {
    await userEvent.hover(within(canvasElement).getByText('Wait between retries'))
  },
}

export const WithAPageActionAfterTheCurrentPage: Story = {
  args: {
    parents: [{ title: 'Retry limit', href: '/2026-11-20-invoice-export/retry-limit.md' }],
    current: 'Wait between retries',
    subtree: { root: retryLimit, currentHref: '#1.1 Wait between retries' },
    pageAction: { label: 'Mark as unread', onClick: () => Promise.resolve() },
  },
}
