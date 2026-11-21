import { type Meta, type StoryObj } from '@storybook/react-vite'
import { DecisionLog } from './decision-log'

const meta = {
  title: 'Design system/DecisionLog',
  component: DecisionLog,
  args: {
    entries: [
      {
        number: 1,
        time: '2026-11-20T09:30:00.000Z',
        source: 'chat',
        text: 'The export job runs every night.',
        decision: undefined,
      },
      {
        number: 2,
        time: '2026-11-20T10:05:00.000Z',
        source: 'page',
        text: 'Will the export job retry 8 times? Nick chose: proposal',
        decision: 'd-1',
      },
    ],
  },
} satisfies Meta<typeof DecisionLog>

export default meta

type Story = StoryObj<typeof meta>

export const TwoEntries: Story = {}
