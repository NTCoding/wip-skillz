import { type Meta, type StoryObj } from '@storybook/react-vite'
import { MarginCard } from './margin-card'

const meta = {
  title: 'Design system/MarginCard',
  component: MarginCard,
  args: {
    label: 'Comment c-1',
    kind: 'comment',
    active: false,
    children: <p>Is 5 retries enough on a slow network?</p>,
  },
} satisfies Meta<typeof MarginCard>

export default meta

type Story = StoryObj<typeof meta>

export const Comment: Story = {}

export const ActiveComment: Story = { args: { active: true } }

export const ActiveGrammarNote: Story = { args: { kind: 'grammar', active: true } }

export const ActiveImprovementNote: Story = { args: { kind: 'improvement', active: true } }
