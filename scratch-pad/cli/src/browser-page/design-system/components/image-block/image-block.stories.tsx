import { type Meta, type StoryObj } from '@storybook/react-vite'
import { ImageBlock } from './image-block'

const exportSteps = [
  'data:image/svg+xml,',
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 120" stroke="currentColor" fill="none">' +
      '<rect x="10" y="30" width="160" height="60" rx="8"/><rect x="220" y="30" width="160" height="60" rx="8"/>' +
      '<rect x="430" y="30" width="160" height="60" rx="8"/><path d="M170 60h50M380 60h50"/></svg>',
  ),
].join('')

const meta = {
  title: 'Design system/ImageBlock',
  component: ImageBlock,
  args: { src: exportSteps, alt: 'The 3 steps of the export job' },
} satisfies Meta<typeof ImageBlock>

export default meta

type Story = StoryObj<typeof meta>

export const ADiagram: Story = {}
