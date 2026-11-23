import { describe, expect, it } from 'vitest'
import { contextSummary } from './decision-context'

describe('contextSummary', () => {
  it('returns the first paragraph and the links to the pages of the scratch pad in their order', () => {
    expect(
      contextSummary(
        [
          'A slow network in the [evening](https://example.com/evening) can make an upload fail.',
          'Read these in order:',
          '1. [How the job runs](how-the-job-runs.md#the-steps) shows where the upload happens.',
          '2. [The `retryLimit`](retry-limit.md) explains why the limit is 5 today.',
          '3. [The status page](https://example.com/status) shows the outages.',
        ].join('\n'),
        'pages/sub/export.md',
      ),
    ).toStrictEqual({
      lead: 'A slow network in the evening can make an upload fail. Read these in order:',
      links: [
        { text: 'How the job runs', page: 'pages/sub/how-the-job-runs.md', headingId: 'the-steps' },
        { text: 'The retryLimit', page: 'pages/sub/retry-limit.md', headingId: undefined },
      ],
    })
  })

  it('returns the links without a first paragraph when the context starts with the links', () => {
    expect(
      contextSummary('1. [The retry limit](#retry-limit) explains the limit.', 'pages/index.md'),
    ).toStrictEqual({
      lead: undefined,
      links: [{ text: 'The retry limit', page: 'pages/index.md', headingId: 'retry-limit' }],
    })
  })

  it('returns an empty summary when the context is empty', () => {
    expect(contextSummary('', 'pages/index.md')).toStrictEqual({ lead: undefined, links: [] })
  })
})
