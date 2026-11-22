import { type Meta, type StoryObj } from '@storybook/react-vite'
import { ThreadDraft } from './thread-draft'

const meta = {
  title: 'Design system/ThreadDraft',
  component: ThreadDraft,
  args: {
    kind: 'comment',
    selectedText: 'The export job retries 5 times.',
    onSend: () => Promise.resolve(),
    onCancel: () => undefined,
  },
} satisfies Meta<typeof ThreadDraft>

export default meta

type Story = StoryObj<typeof meta>

export const Comment: Story = {}

export const CommentWithOutbox: Story = { args: { onAddToOutbox: () => Promise.resolve() } }

export const GrammarNote: Story = { args: { kind: 'grammar' } }

export const ImprovementNote: Story = { args: { kind: 'improvement' } }
