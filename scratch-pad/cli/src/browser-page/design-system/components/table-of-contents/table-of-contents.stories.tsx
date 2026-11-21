import { type Meta, type StoryObj } from '@storybook/react-vite'
import { TableOfContents } from './table-of-contents'

const meta = {
  title: 'Design system/TableOfContents',
  component: TableOfContents,
  args: {
    label: 'Sections of Invoice export',
    entries: [
      { id: 'retry-limit', text: 'Retry limit', level: 2 },
      { id: 'wait-between-retries', text: 'Wait between retries', level: 3 },
      {
        id: 'will-the-export-job-retry-8-times',
        text: 'Will the export job retry 8 times when the network of a shop is slow?',
        level: 2,
      },
    ],
    currentId: 'wait-between-retries',
    hrefOf: (id) => `#${id}`,
    onNavigate: () => undefined,
  },
} satisfies Meta<typeof TableOfContents>

export default meta

type Story = StoryObj<typeof meta>

export const WithACurrentSection: Story = {}
