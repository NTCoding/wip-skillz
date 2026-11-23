import { type Meta, type StoryObj } from '@storybook/react-vite'
import { ReadingColumn } from '../reading-column/reading-column'
import { ItemList, type ItemRow } from './item-list'

const newPage: ItemRow = {
  key: 'page pages/retry-limit.md',
  kind: 'A new page',
  where: 'Retry limit',
  quote: 'The export job retries the upload of the invoices.',
  quoteKind: 'description',
  last: undefined,
  time: '2026-11-20T21:20:00.000Z',
  shownTime: '20 Nov, 21:20',
  late: false,
  linkLabel: 'Open the page',
  href: '/2026-11-20-invoice-export/retry-limit.md',
}

const decision: ItemRow = {
  key: 'd-1',
  kind: 'A decision to make',
  where: 'Invoice export',
  quote: 'Will the export job retry 8 times?',
  quoteKind: 'decision',
  last: undefined,
  time: undefined,
  shownTime: undefined,
  late: false,
  linkLabel: 'Open the decision',
  href: '/2026-11-20-invoice-export/#d-1',
}

const sent: ItemRow = {
  key: 'c-2',
  kind: 'Sent, no reply yet',
  where: 'Invoice template › The tax number',
  quote: 'A guest without a company doesn’t have a tax number.',
  quoteKind: 'text',
  last: 'Nick: Does a guest see an empty field?',
  time: '2026-11-20T21:00:00.000Z',
  shownTime: 'Sent 25 min ago',
  late: true,
  linkLabel: 'Open the thread',
  href: '/2026-11-20-invoice-export/invoice-template.md#c-2',
}

const meta = {
  title: 'Design system/ItemList',
  component: ItemList,
  args: {
    groups: [
      { title: 'Waiting for you', count: 1, rows: [newPage, decision] },
      { title: 'Waiting for the agent', count: 1, rows: [sent] },
    ],
    onNavigate: () => undefined,
  },
  decorators: [(story) => <ReadingColumn>{story()}</ReadingColumn>],
} satisfies Meta<typeof ItemList>

export default meta

type Story = StoryObj<typeof meta>

export const UnderTheHeadingsOfTheirStatus: Story = {}

export const OneStatus: Story = { args: { groups: [{ title: undefined, count: 1, rows: [sent] }] } }
