import { type Meta, type StoryObj } from '@storybook/react-vite'
import { DecisionPageStatus } from './decision-page-status'

const meta = {
  title: 'Design system/DecisionPageStatus',
  component: DecisionPageStatus,
  args: { state: 'open' },
} satisfies Meta<typeof DecisionPageStatus>

export default meta

type Story = StoryObj<typeof meta>

export const Draft: Story = { args: { state: 'draft' } }

export const Open: Story = {}

export const ChangesRequested: Story = { args: { state: 'changes-requested' } }

export const Decided: Story = { args: { state: 'decided' } }
