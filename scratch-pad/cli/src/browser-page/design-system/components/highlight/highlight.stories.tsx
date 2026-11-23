import { type Meta, type StoryObj } from '@storybook/react-vite'
import { Highlight } from './highlight'

const meta = {
  title: 'Design system/Highlight',
  component: Highlight,
  args: { threads: ['c-1'], kind: 'comment', active: false, children: 'retries 5 times' },
  decorators: [(story) => <p>The export job {story()} before it gives up on a shop.</p>],
} satisfies Meta<typeof Highlight>

export default meta

type Story = StoryObj<typeof meta>

export const Comment: Story = {}

export const ActiveComment: Story = { args: { active: true } }

export const GrammarNote: Story = { args: { kind: 'grammar', threads: ['g-1'] } }

export const ImprovementNote: Story = { args: { kind: 'improvement', threads: ['i-1'] } }

export const SearchMatch: Story = { args: { kind: 'search', threads: [] } }
