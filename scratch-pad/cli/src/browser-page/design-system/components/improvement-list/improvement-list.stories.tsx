import { type Meta, type StoryObj } from '@storybook/react-vite'
import { ImprovementList } from './improvement-list'

const meta = {
  title: 'Design system/ImprovementList',
  component: ImprovementList,
  args: {
    label: 'Improvements',
    onNavigate: () => undefined,
    entries: [
      {
        from: 'agent',
        id: 'improvement-1',
        number: 1,
        time: '2026-11-20T09:30:00.000Z',
        title: 'The export job skips the custom files.',
        markdown:
          'The export job only copies the pages.\n\nIt should copy the custom files of the invoice template too.',
        details: (
          <>
            <p>The export job only copies the pages.</p>
            <p>It should copy the custom files of the invoice template too.</p>
          </>
        ),
        open: true,
      },
      {
        from: 'grammar',
        id: 'g-1',
        href: '#g-1',
        time: '2026-11-20T10:05:00.000Z',
        text: 'Write "waits for" here.',
        outcome: undefined,
      },
      {
        from: 'improvement',
        id: 'i-1',
        href: '#i-1',
        time: '2026-11-20T10:20:00.000Z',
        text: 'Show the retry limit of the export job on the index page.',
        outcome: undefined,
      },
    ],
  },
} satisfies Meta<typeof ImprovementList>

export default meta

type Story = StoryObj<typeof meta>

export const ThreeEntries: Story = {}

export const ImprovementNoteDone: Story = {
  args: {
    entries: [
      {
        from: 'improvement',
        id: 'i-1',
        href: '#i-1',
        time: '2026-11-20T10:20:00.000Z',
        text: 'Show the retry limit of the export job on the index page.',
        outcome: 'Added the retry limit of 5 attempts to the index page.',
      },
    ],
  },
}

export const WithEditAndDelete: Story = {
  args: {
    actions: { edit: () => Promise.resolve(), delete: () => Promise.resolve() },
  },
}
