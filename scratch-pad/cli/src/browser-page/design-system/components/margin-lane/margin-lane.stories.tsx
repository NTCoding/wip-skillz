import { type Meta, type StoryObj } from '@storybook/react-vite'
import { MarginCard } from '../margin-card/margin-card'
import { MarginMarker } from '../margin-marker/margin-marker'
import { ReadingColumn } from '../reading-column/reading-column'
import { MarginLane } from './margin-lane'

const meta = {
  title: 'Design system/MarginLane',
  component: MarginLane,
  args: {
    label: 'Comments and notes',
    items: [
      {
        key: 'c-1',
        anchorLines: '3-3',
        content: (
          <MarginCard label="Comment c-1" name="c-1" kind="comment" active={false}>
            <p>Is 5 retries enough on a slow network?</p>
          </MarginCard>
        ),
        marker: (
          <MarginMarker
            label="Comment c-1"
            kind="comment"
            messages={1}
            open
            onClick={() => undefined}
          />
        ),
        popup: true,
      },
      {
        key: 'g-1',
        anchorLines: '3-3',
        content: (
          <MarginCard label="Grammar / tone g-1" name="g-1" kind="grammar" active={false}>
            <p>Write who retries the export rather than “it”.</p>
          </MarginCard>
        ),
        marker: (
          <MarginMarker
            label="Grammar / tone g-1"
            kind="grammar"
            messages={1}
            open={false}
            onClick={() => undefined}
          />
        ),
        popup: false,
      },
    ],
  },
  render: (args) => (
    <ReadingColumn margin={<MarginLane {...args} />}>
      <h1 data-lines="1-1">Invoice export</h1>
      <p data-lines="3-3">The export job retries 5 times. It waits 30 seconds each time.</p>
      <p data-lines="5-5">The job writes one file per shop.</p>
    </ReadingColumn>
  ),
} satisfies Meta<typeof MarginLane>

export default meta

type Story = StoryObj<typeof meta>

export const TwoCardsBesideOneBlock: Story = {}
