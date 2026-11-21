import { type Meta, type StoryObj } from '@storybook/react-vite'
import { MarginMarker } from './margin-marker'

const meta = {
  title: 'Design system/MarginMarker',
  component: MarginMarker,
  args: {
    label: 'Comment c-1',
    kind: 'comment',
    messages: 1,
    open: false,
    onClick: () => undefined,
  },
} satisfies Meta<typeof MarginMarker>

export default meta

type Story = StoryObj<typeof meta>

export const Comment: Story = {}

export const CommentWithReplies: Story = { args: { messages: 3 } }

export const OpenComment: Story = { args: { open: true } }

export const GrammarNote: Story = { args: { label: 'Grammar / tone g-1', kind: 'grammar' } }

export const ImprovementNote: Story = { args: { label: 'Improvement i-1', kind: 'improvement' } }
