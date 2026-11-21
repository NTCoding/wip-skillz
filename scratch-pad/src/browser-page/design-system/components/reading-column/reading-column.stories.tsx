import { type Meta, type StoryObj } from '@storybook/react-vite'
import { ReadingColumn } from './reading-column'

const meta = {
  title: 'Design system/ReadingColumn',
  component: ReadingColumn,
  args: {
    children: (
      <>
        <h1>Invoice export</h1>
        <p>
          The export job writes the paid invoices of each shop to a CSV file. It runs every night
          and uses the <a href="#retry-limit">retry limit</a> below.
        </p>
        <h2 id="retry-limit">Retry limit</h2>
        <p>
          The job retries a failed shop <strong>5 times</strong>. The value is in{' '}
          <code>exportJob.retryLimit</code>.
        </p>
        <ul>
          <li>The first retry waits 30 seconds.</li>
          <li>Each retry after that waits twice as long.</li>
        </ul>
        <h3>What a shop sees</h3>
        <blockquote>
          <p>Your invoices for March are ready.</p>
        </blockquote>
        <ol>
          <li>The job reads the paid invoices.</li>
          <li>The job writes one file per shop.</li>
        </ol>
      </>
    ),
  },
} satisfies Meta<typeof ReadingColumn>

export default meta

type Story = StoryObj<typeof meta>

export const APage: Story = {}
