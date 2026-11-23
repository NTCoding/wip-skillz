import { type Meta, type StoryObj } from '@storybook/react-vite'
import { PanelMenu, type PanelMenuItem } from './panel-menu'

const items: PanelMenuItem[] = [
  {
    key: 'c-1',
    href: '/2026-11-20-invoice-export/retry-limit.md#c-1',
    kind: 'reply',
    heading: 'The agent replied',
    where: 'Retry limit',
    quote: 'The export job retries 5 times.',
    last: 'Agent: I have raised the limit to 8 retries.',
    time: '2026-11-20T21:12:00.000Z',
    shownTime: '20 Nov, 21:12',
    context: undefined,
    linkLabel: undefined,
  },
  {
    key: 'outbox-1',
    href: '/2026-11-20-invoice-export/invoice-template.md#outbox-1',
    kind: 'queued',
    heading: 'Comment',
    where: 'Invoice template › The tax number',
    quote: 'the tax number of the shop',
    last: 'Is the tax number on every invoice?',
    time: '2026-11-20T21:14:00.000Z',
    shownTime: 'Queued 20 Nov, 21:14',
    context: undefined,
    linkLabel: 'Show on the page',
  },
]

const updates: PanelMenuItem[] = [
  {
    key: 'sections pages/invoice-template.md',
    href: '/2026-11-20-invoice-export/invoice-template.md#tax-number',
    kind: 'section',
    heading: 'Updates to Invoice template',
    where: '3 sections changed',
    quote: undefined,
    last: undefined,
    time: '2026-11-20T21:15:00.000Z',
    shownTime: '20 Nov, 21:15',
    context: undefined,
    linkLabel: undefined,
  },
  {
    key: 'page pages/retry-limit.md',
    href: '/2026-11-20-invoice-export/retry-limit.md',
    kind: 'page',
    heading: 'A new page',
    where: 'Retry limit',
    quote: 'The export job retries the upload of the invoices.',
    last: undefined,
    time: '2026-11-20T21:10:00.000Z',
    shownTime: '20 Nov, 21:10',
    context: undefined,
    linkLabel: undefined,
  },
]

const decision: PanelMenuItem = {
  key: 'd-3',
  href: '/2026-11-20-invoice-export/retry-limit.md#d-3',
  kind: 'decision',
  heading: 'A decision to make',
  where: 'Retry limit',
  quote: 'Will the job tell the team after the last retry?',
  last: undefined,
  time: '2026-11-20T21:40:00.000Z',
  shownTime: '20 Nov, 21:40',
  context: {
    lead: 'The team only reads the log in the morning. Read these in order:',
    links: [
      { text: 'How the job runs', href: '/2026-11-20-invoice-export/how-the-job-runs.md' },
      {
        text: 'What counts as a failure',
        href: '/2026-11-20-invoice-export/retry-limit.md#what-counts-as-a-failure',
      },
    ],
  },
  linkLabel: undefined,
}

const meta = {
  title: 'Design system/PanelMenu',
  component: PanelMenu,
  args: {
    id: undefined,
    labelledBy: 'panel-menu-title',
    items,
    onNavigate: () => undefined,
    onChoose: () => undefined,
    onTab: undefined,
    focusFirstItem: true,
  },
  decorators: [
    (story) => (
      <div>
        <p id="panel-menu-title">Waiting for you</p>
        {story()}
      </div>
    ),
  ],
} satisfies Meta<typeof PanelMenu>

export default meta

type Story = StoryObj<typeof meta>

export const AReplyAndAQueuedComment: Story = {}

export const UpdatesToPages: Story = { args: { items: updates } }

export const ADecisionWithItsContext: Story = { args: { items: [decision, ...items] } }
