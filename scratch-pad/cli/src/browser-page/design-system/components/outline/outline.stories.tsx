import { type Meta, type StoryObj } from '@storybook/react-vite'
import { within } from 'storybook/test'
import { Outline } from './outline'

const meta = {
  title: 'Design system/Outline',
  component: Outline,
  args: {
    label: 'Sections of Invoice export',
    entries: [
      { id: 'how-the-job-runs', text: 'How the job runs', level: 2 },
      { id: 'what-a-shop-sees', text: 'What a shop sees', level: 3 },
      { id: 'the-file-of-a-shop', text: 'The file of a shop', level: 4 },
      {
        id: 'will-the-export-job-retry-8-times',
        text: 'Will the export job retry 8 times when the network of a shop is slow?',
        level: 2,
      },
      { id: 'what-happens-next', text: 'What happens next', level: 2 },
    ],
    currentId: 'what-a-shop-sees',
    hrefOf: (id) => `#${id}`,
    onNavigate: () => undefined,
  },
} satisfies Meta<typeof Outline>

export default meta

type Story = StoryObj<typeof meta>

export const WithACurrentSection: Story = {}

export const WithTheCardOpen: Story = {
  play: ({ canvasElement }) => {
    within(canvasElement).getAllByRole('link')[0]?.focus()
  },
}
