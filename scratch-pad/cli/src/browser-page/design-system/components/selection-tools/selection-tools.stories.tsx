import { type Meta, type StoryObj } from '@storybook/react-vite'
import { SelectionTools } from './selection-tools'

const meta = {
  title: 'Design system/SelectionTools',
  component: SelectionTools,
  args: { top: 60, centre: 200, onPick: () => undefined, onLeave: () => undefined },
  decorators: [
    (story) => (
      <div data-lines="3-3">
        <p>
          <br />
          <br />
          The export job retries 5 times before it gives up on a shop.
        </p>
        {story()}
      </div>
    ),
  ],
} satisfies Meta<typeof SelectionTools>

export default meta

type Story = StoryObj<typeof meta>

export const AboveTheSelection: Story = {}
