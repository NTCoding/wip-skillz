import { type SearchResult } from './api-responses'

// The results of the search for "retry" on the pages of the fake connection
export const retrySearchResults: SearchResult[] = [
  {
    page: 'pages/index.md',
    heading: 'Retry limit',
    headingId: 'retry-limit',
    snippet:
      'The job retries `5` times. See [this section](#retry-limit) and [the retry guide](https://example.com/retries).',
    matches: [
      { start: 47, end: 52 },
      { start: 69, end: 74 },
    ],
  },
  {
    page: 'pages/first-retry.md',
    heading: 'Why 30 seconds?',
    headingId: 'why-30-seconds',
    snippet: 'The first retry waits 30 seconds.',
    matches: [{ start: 10, end: 15 }],
  },
]
