import { type Meta, type StoryObj } from '@storybook/react-vite'
import { SectionChange } from './section-change'

const meta = {
  title: 'Design system/SectionChange',
  component: SectionChange,
  args: {
    title: 'Retry limit',
    shownTime: '20 Nov, 21:42',
    active: false,
    onMarkAsRead: () => Promise.resolve(),
  },
} satisfies Meta<typeof SectionChange>

export default meta

type Story = StoryObj<typeof meta>

export const Changed: Story = {}

export const Active: Story = { args: { active: true } }
