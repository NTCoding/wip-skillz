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
    linkLabel: 'Show on the page',
  },
]

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
