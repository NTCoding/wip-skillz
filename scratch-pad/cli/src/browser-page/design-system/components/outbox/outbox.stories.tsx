import { type Meta, type StoryObj } from '@storybook/react-vite'
import { userEvent, within } from 'storybook/test'
import { TopBar } from '../top-bar/top-bar'
import { Outbox, type OutboxEntry } from './outbox'

const entries: OutboxEntry[] = [
  {
    key: 'outbox-1',
    href: '/2026-11-20-invoice-export/invoice-template.md#outbox-1',
    kind: 'comment',
    where: 'Invoice template › The tax number',
    quote: 'the tax number of the shop',
    text: 'Is the tax number on every invoice? Check the credit notes too.',
    time: '2026-11-20T21:14:00.000Z',
    shownTime: 'Queued 20 Nov, 21:14',
  },
  {
    key: 'outbox-2',
    href: '/2026-11-20-invoice-export/retry-limit.md#c-1',
    kind: 'reply',
    where: 'Retry limit',
    quote: 'The export job retries 5 times.',
    text: 'Can a shop ask for 10?',
    time: '2026-11-20T21:15:00.000Z',
    shownTime: 'Queued 20 Nov, 21:15',
  },
]

const meta = {
  title: 'Design system/Outbox',
  component: Outbox,
  args: {
    count: 2,
    entries,
    editing: false,
    onSendAll: () => Promise.resolve(),
    onNavigate: () => undefined,
  },
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
          <br />
          <br />
          <br />
          <br />
        </p>
      </div>
    ),
  ],
} satisfies Meta<typeof Outbox>

export default meta

type Story = StoryObj<typeof meta>

export const Closed: Story = {}

async function openOutbox({ canvasElement }: { readonly canvasElement: HTMLElement }) {
  const [button] = within(canvasElement).getAllByRole('button', { name: /Outbox/ })
  if (button !== undefined) {
    await userEvent.click(button)
  }
}

export const Open: Story = { play: openOutbox }

export const Empty: Story = { args: { count: 0, entries: [] }, play: openOutbox }

export const WhileNickEditsAnItem: Story = { args: { editing: true }, play: openOutbox }
