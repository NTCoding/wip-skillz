import { type Meta, type StoryObj } from '@storybook/react-vite'
import { StatusPill } from './status-pill'

const meta = {
  title: 'Design system/StatusPill',
  component: StatusPill,
  args: { children: 'The server has stopped. The page will update when it’s back.' },
} satisfies Meta<typeof StatusPill>

export default meta

export const ServerStopped: StoryObj<typeof meta> = {}
