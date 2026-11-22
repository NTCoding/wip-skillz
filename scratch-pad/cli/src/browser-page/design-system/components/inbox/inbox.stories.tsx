import { type Meta, type StoryObj } from '@storybook/react-vite'
import { userEvent, within } from 'storybook/test'
import { TopBar } from '../top-bar/top-bar'
import { Inbox, type InboxEntry } from './inbox'

const entries: InboxEntry[] = [
  {
    key: 'page pages/retry-limit.md',
    href: '/2026-11-20-invoice-export/retry-limit.md',
    kind: 'page',
    where: 'Retry limit',
    quote: 'The export job retries the upload of the invoices.',
    last: undefined,
    time: '2026-11-20T21:20:00.000Z',
    shownTime: '20 Nov, 21:20',
  },
  {
    key: 'section pages/invoice-template.md the-tax-number',
    href: '/2026-11-20-invoice-export/invoice-template.md#the-tax-number',
    kind: 'section',
    where: 'Invoice template › 1.1 Tax number › Shops outside the EU',
    quote: undefined,
    last: undefined,
    time: '2026-11-20T21:15:00.000Z',
    shownTime: 'Changed 20 Nov, 21:15',
  },
  {
    key: 'd-1',
    href: '/2026-11-20-invoice-export/#d-1',
    kind: 'decision',
    where: 'Invoice export',
    quote: 'Will the export job retry 8 times?',
    last: undefined,
    time: undefined,
    shownTime: undefined,
  },
  {
    key: 'c-1',
    href: '/2026-11-20-invoice-export/#c-1',
    kind: 'reply',
    where: 'Invoice export',
    quote: 'The export job retries 5 times.',
    last: 'Agent: I have raised the limit to 8 retries.',
    time: '2026-11-20T21:12:00.000Z',
    shownTime: '20 Nov, 21:12',
  },
]

const meta = {
  title: 'Design system/Inbox',
  component: Inbox,
  args: { entries, onNavigate: () => undefined },
  decorators: [
    (story) => (
      <div>
        <TopBar
          title="Invoice export"
          titleHref="/2026-11-20-invoice-export/"
          parents={[]}
          current="Retry limit"
          onNavigate={() => undefined}
          actions={story()}
        />
        <p>
          <br />
          <br />
          <br />
          <br />
          <br />
          <br />
          <br />
          <br />
          <br />
          <br />
          <br />
          <br />
        </p>
      </div>
    ),
  ],
} satisfies Meta<typeof Inbox>

export default meta

type Story = StoryObj<typeof meta>

export const Closed: Story = {}

export const Open: Story = {
  play: async ({ canvasElement }) => {
    const [button] = within(canvasElement).getAllByRole('button', { name: /Inbox/ })
    if (button !== undefined) {
      await userEvent.click(button)
    }
  },
}

export const Empty: Story = { args: { entries: [] } }
