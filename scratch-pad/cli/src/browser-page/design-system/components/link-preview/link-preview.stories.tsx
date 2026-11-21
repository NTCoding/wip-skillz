import { type Meta, type StoryObj } from '@storybook/react-vite'
import { LinkPreview } from './link-preview'

const meta = {
  title: 'Design system/LinkPreview',
  component: LinkPreview,
  args: {
    id: 'preview-of-the-invoice-template',
    title: 'Invoice template',
    path: 'Invoice export / Invoice template',
    paragraphs: [
      { text: 'Each invoice shows the tax number of the shop.', heading: false },
      { text: 'Tax number', heading: true },
      { text: 'A guest without a company doesn’t have a tax number.', heading: false },
    ],
  },
} satisfies Meta<typeof LinkPreview>

export default meta

type Story = StoryObj<typeof meta>

export const APage: Story = {}
