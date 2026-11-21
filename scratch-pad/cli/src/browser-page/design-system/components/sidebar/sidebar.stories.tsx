import { type Meta, type StoryObj } from '@storybook/react-vite'
import { SidebarLink } from '../sidebar-link/sidebar-link'
import { Sidebar } from './sidebar'

const meta = {
  title: 'Design system/Sidebar',
  component: Sidebar,
  args: {
    label: 'Pages of the scratch pad',
    title: 'Invoice export',
    titleHref: '#invoice-export',
    onNavigate: () => undefined,
    views: (
      <>
        <SidebarLink
          href="#progress-tracker"
          icon="progress-tracker"
          title="Progress tracker"
          current={false}
          onNavigate={() => undefined}
        />
        <SidebarLink
          href="#decisions"
          icon="decision"
          title="Decisions"
          current={false}
          onNavigate={() => undefined}
        />
      </>
    ),
    heading: 'Pages',
    collapsed: false,
    onCollapsedChange: () => undefined,
    children: ['Invoice export', 'Invoice template', 'Retry limit'].map((title, index) => (
      <SidebarLink
        key={title}
        href={`#${title}`}
        title={title}
        current={index === 0}
        onNavigate={() => undefined}
      />
    )),
  },
} satisfies Meta<typeof Sidebar>

export default meta

type Story = StoryObj<typeof meta>

export const Open: Story = {}

export const Collapsed: Story = { args: { collapsed: true } }
