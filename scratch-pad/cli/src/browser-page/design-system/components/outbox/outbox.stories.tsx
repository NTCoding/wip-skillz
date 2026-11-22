import { type Meta, type StoryObj } from '@storybook/react-vite'
import { userEvent, within } from 'storybook/test'
import { TopBar } from '../top-bar/top-bar'
import { Outbox } from './outbox'

const meta = {
  title: 'Design system/Outbox',
  component: Outbox,
  args: { count: 3, editing: false, onSendAll: () => Promise.resolve() },
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

export const Empty: Story = { args: { count: 0 } }

export const WhileNickEditsAnItem: Story = { args: { editing: true }, play: openOutbox }
