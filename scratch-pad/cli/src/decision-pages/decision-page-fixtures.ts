import { renderPage, type RenderedPage } from '../rendered-page/rendered-page'

export const decisionPageFile = 'pages/2.1-retry-wait.md'

// A decision page that the agent has finished. It has 2 options. The second option has a before and
// after of code, which means the current text and the proposed text.
export function finishedDecisionPage(id = 'd-4'): string {
  return [
    `:::decision-page ${id}`,
    ':::',
    '',
    '# How long should a retry wait?',
    'The export job retries a failed upload. This page decides the wait between 2 retries.',
    '',
    '## Context',
    'A shop with a slow network fails an upload in the evening. For example, shop 12 fails 3 times a week.',
    '',
    '## Options',
    '',
    '### Option 1: Wait 30 seconds',
    'Each retry waits 30 seconds.',
    '',
    '### Option 2: Double the wait',
    'Each retry waits twice as long as the retry before. The current text:',
    '',
    '```text',
    'wait = 30',
    '```',
    '',
    'The proposed text:',
    '',
    '```text',
    'wait = wait * 2',
    '```',
    '',
    '## Agent recommendation',
    'Option 2, because a slow network needs more time.',
    '',
  ].join('\n')
}

// A page without the set of ready decision pages shows every decision page as ready.
export function renderedDecisionPage(
  markdown: string,
  page = decisionPageFile,
  readyDecisionPages: ReadonlySet<string> | undefined = undefined,
): RenderedPage {
  return renderPage({ page, markdown, readCustomFile: () => undefined, readyDecisionPages })
}

export function readyEvent(id: string) {
  return {
    time: '2026-03-14T09:30:00.000Z',
    kind: 'decision-ready',
    by: 'agent',
    item: id,
  } as const
}
