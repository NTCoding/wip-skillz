import { type Meta, type StoryObj } from '@storybook/react-vite'
import { PageList } from './page-list'

const meta = {
  title: 'Design system/PageList',
  component: PageList,
  args: {
    label: 'Pages',
    onNavigate: () => undefined,
    entries: [
      {
        href: '#how-the-job-runs',
        title: 'How the job runs',
        description:
          'The job reads the paid invoices of the day and writes one CSV file per shop to the storage of the shop.',
        decisions: 1,
        replies: 2,
      },
      {
        href: '#invoice-template',
        title: 'Invoice template',
        description: 'Each invoice uses one template.',
        decisions: 0,
        replies: 0,
      },
      {
        href: '#shop-storage',
        title: 'Shop storage',
        description: undefined,
        decisions: 0,
        replies: 1,
      },
    ],
  },
} satisfies Meta<typeof PageList>

export default meta

type Story = StoryObj<typeof meta>

export const TopLevelPages: Story = {}
