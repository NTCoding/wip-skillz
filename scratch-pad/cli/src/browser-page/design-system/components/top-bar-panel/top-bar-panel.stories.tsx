import { type Meta, type StoryObj } from '@storybook/react-vite'
import { userEvent, within } from 'storybook/test'
import { TopBar } from '../top-bar/top-bar'
import { TopBarPanel } from './top-bar-panel'

const meta = {
  title: 'Design system/TopBarPanel',
  component: TopBarPanel,
  args: {
    icon: 'inbox',
    label: 'Exports',
    countText: '2 exports are running',
    count: 2,
    tone: 'inbox',
    children: () => <p>The export of the paid invoices is running.</p>,
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
        </p>
      </div>
    ),
  ],
} satisfies Meta<typeof TopBarPanel>

export default meta

type Story = StoryObj<typeof meta>

export const Closed: Story = {}

export const Open: Story = {
  play: async ({ canvasElement }) => {
    const [button] = within(canvasElement).getAllByRole('button', { name: /Exports/ })
    if (button !== undefined) {
      await userEvent.click(button)
    }
  },
}

export const OutboxTone: Story = { args: { icon: 'outbox', tone: 'outbox' } }
