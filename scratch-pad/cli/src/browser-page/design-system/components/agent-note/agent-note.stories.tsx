import { type Meta, type StoryObj } from '@storybook/react-vite'
import { AgentNote } from './agent-note'

const meta = {
  title: 'Design system/AgentNote',
  component: AgentNote,
  args: {
    children: (
      <p>
        I haven’t read the code of the export job. I’ve only looked at its <code>git log</code>.
      </p>
    ),
  },
} satisfies Meta<typeof AgentNote>

export default meta

type Story = StoryObj<typeof meta>

export const OneParagraph: Story = {}

export const SeveralParagraphs: Story = {
  args: {
    children: (
      <>
        <p>I haven’t run the export job against the invoices of a real shop.</p>
        <p>
          The retry limit of <strong>5</strong> comes from the config file rather than from a test.
        </p>
      </>
    ),
  },
}
