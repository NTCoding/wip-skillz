import { type Meta, type StoryObj } from '@storybook/react-vite'
import { userEvent, within } from 'storybook/test'
import { TopBar } from '../top-bar/top-bar'
import { Inbox, type InboxEntry } from './inbox'

const answers: InboxEntry[] = [
  {
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
  },
  {
    key: 'c-1',
    href: '/2026-11-20-invoice-export/#c-1',
    kind: 'reply',
    heading: 'The agent replied',
    where: 'Invoice export',
    quote: 'The export job retries 5 times.',
    last: 'Agent: I have raised the limit to 8 retries.',
    time: '2026-11-20T21:12:00.000Z',
    shownTime: '20 Nov, 21:12',
    context: undefined,
  },
  {
    key: 'd-1',
    href: '/2026-11-20-invoice-export/#d-1',
    kind: 'decision',
    heading: 'A decision to make',
    where: 'Invoice export',
    quote: 'Will the export job retry 8 times?',
    last: undefined,
    time: '2026-11-20T20:30:00.000Z',
    shownTime: '20 Nov, 20:30',
    context: undefined,
  },
]

const updates: InboxEntry[] = [
  {
    key: 'page pages/retry-limit.md',
    href: '/2026-11-20-invoice-export/retry-limit.md',
    kind: 'page',
    heading: 'A new page',
    where: 'Retry limit',
    quote: 'The export job retries the upload of the invoices.',
    last: undefined,
    time: '2026-11-20T21:20:00.000Z',
    shownTime: '20 Nov, 21:20',
    context: undefined,
  },
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
  },
]

const meta = {
  title: 'Design system/Inbox',
  component: Inbox,
  args: { entries: [...answers, ...updates], onNavigate: () => undefined },
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

async function clickButton(canvasElement: HTMLElement, name: RegExp): Promise<void> {
  const [button] = within(canvasElement).getAllByRole('button', { name })
  if (button !== undefined) {
    await userEvent.click(button)
  }
}

export const Closed: Story = {}

export const Open: Story = {
  play: async ({ canvasElement }) => clickButton(canvasElement, /Inbox/),
}

export const UpdatesOpen: Story = {
  play: async ({ canvasElement }) => {
    await clickButton(canvasElement, /Inbox/)
    await clickButton(canvasElement, /Updates to pages/)
  },
}

export const OnlyUpdates: Story = { args: { entries: updates } }

export const Empty: Story = { args: { entries: [] } }
