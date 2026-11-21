import { type Meta, type StoryObj } from '@storybook/react-vite'
import { FullSizeView } from './full-size-view'

const meta = {
  title: 'Design system/FullSizeView',
  component: FullSizeView,
  args: {
    label: 'diagram',
    children: <p>The export job reads the paid invoices and writes one file per shop.</p>,
  },
} satisfies Meta<typeof FullSizeView>

export default meta

type Story = StoryObj<typeof meta>

export const AroundABlock: Story = {}
