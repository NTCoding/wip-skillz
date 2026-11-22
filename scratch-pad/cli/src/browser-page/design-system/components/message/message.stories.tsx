import { type Meta, type StoryObj } from '@storybook/react-vite'
import { Message } from './message'

const meta = {
  title: 'Design system/Message',
  component: Message,
  args: {
    author: 'nick',
    text: 'Is 5 retries enough for the export job on a slow network?',
    time: '2026-11-20T21:09:00.000Z',
    shownTime: '20 Nov, 21:09',
  },
} satisfies Meta<typeof Message>

export default meta

type Story = StoryObj<typeof meta>

export const FromNick: Story = {}

export const FromTheAgent: Story = {
  args: { author: 'agent', text: 'I have raised the retry limit of the export job to 8.' },
}
