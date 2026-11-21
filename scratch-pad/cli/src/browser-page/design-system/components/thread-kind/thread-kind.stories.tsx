import { type Meta, type StoryObj } from '@storybook/react-vite'
import { ThreadKind } from './thread-kind'

const meta = {
  title: 'Design system/ThreadKind',
  component: ThreadKind,
  args: { kind: 'comment' },
} satisfies Meta<typeof ThreadKind>

export default meta

type Story = StoryObj<typeof meta>

export const Comment: Story = {}

export const GrammarNote: Story = { args: { kind: 'grammar' } }

export const ImprovementNote: Story = { args: { kind: 'improvement' } }
