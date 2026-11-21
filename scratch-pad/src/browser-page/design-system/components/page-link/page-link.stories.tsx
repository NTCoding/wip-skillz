import { type Meta, type StoryObj } from '@storybook/react-vite'
import { PageLink } from './page-link'

const meta = {
  title: 'Design system/PageLink',
  component: PageLink,
  args: {
    href: '/2026-11-20-invoice-export/invoice-template.md',
    children: 'the invoice template',
    onNavigate: () => undefined,
    loadPreview: () =>
      Promise.resolve({
        title: 'Invoice template',
        path: 'Invoice export / Invoice template',
        paragraphs: [{ text: 'Each invoice shows the tax number of the shop.', heading: false }],
      }),
  },
  render: (args) => (
    <p>
      The tax number is described in <PageLink {...args} />. Hover over the link to see the preview.
    </p>
  ),
} satisfies Meta<typeof PageLink>

export default meta

type Story = StoryObj<typeof meta>

export const InAParagraph: Story = {}
