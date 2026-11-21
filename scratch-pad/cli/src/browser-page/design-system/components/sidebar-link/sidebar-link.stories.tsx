import { type Meta, type StoryObj } from '@storybook/react-vite'
import { SidebarLink } from './sidebar-link'

const meta = {
  title: 'Design system/SidebarLink',
  component: SidebarLink,
  args: {
    href: '/2026-11-20-invoice-export/invoice-template.md',
    title: 'Invoice template',
    current: false,
    onNavigate: () => undefined,
    children: <p>The sections of the page</p>,
  },
  render: (args) => (
    <ul>
      <SidebarLink {...args} />
    </ul>
  ),
} satisfies Meta<typeof SidebarLink>

export default meta

type Story = StoryObj<typeof meta>

export const Other: Story = {}

export const Current: Story = { args: { current: true } }

export const WithSubPages: Story = {
  args: {
    current: true,
    subPages: (
      <SidebarLink
        href="/2026-11-20-invoice-export/tax-number.md"
        title="Tax number"
        current={false}
        onNavigate={() => undefined}
        subPages={
          <SidebarLink
            href="/2026-11-20-invoice-export/company-prefix.md"
            title="Company prefix"
            current={false}
            onNavigate={() => undefined}
          />
        }
      />
    ),
  },
}
