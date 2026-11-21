import { type Meta, type StoryObj } from '@storybook/react-vite'
import { AppFrame } from './app-frame'

const meta = {
  title: 'Design system/AppFrame',
  component: AppFrame,
  args: {
    topBar: <p>The top bar</p>,
    sidebar: <p>The sidebar</p>,
    sidebarCollapsed: false,
    children: <p>The reading column</p>,
  },
} satisfies Meta<typeof AppFrame>

export default meta

type Story = StoryObj<typeof meta>

export const WithTheSidebar: Story = {}

export const WithTheSidebarCollapsed: Story = { args: { sidebarCollapsed: true } }
