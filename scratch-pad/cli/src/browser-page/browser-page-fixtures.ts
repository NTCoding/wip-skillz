import { vi } from 'vitest'
import {
  type DecisionLogEntry,
  type Improvements,
  type NickInbox,
  type PadChange,
  type PageReadMark,
  type SectionHash,
  type Thread,
  type ViewedPage,
} from './api-responses'
import { BrowserPageError } from './browser-page-error'
import { type NarrowWindow } from './sidebar-state'
import { servedAddresses } from './browser-route'
import { fakeOutbox } from './outbox-fixtures'
import { pageSummaries } from './page-summary-fixtures'
import { progressTracker } from './tracker-fixtures'
import {
  type ChangeListeners,
  type NewThread,
  type ScratchPadConnection,
} from './scratch-pad-connection'

export { pageSummaries } from './page-summary-fixtures'
export { progressTracker } from './tracker-fixtures'

export const exportPad = '2026-11-20-invoice-export'

interface FakeNarrowWindow extends NarrowWindow {
  readonly resize: (narrow: boolean) => void
}

export function fakeNarrowWindow(narrow = false): FakeNarrowWindow {
  const listeners = new Set<() => void>()
  const query = {
    matches: narrow,
    addEventListener: (_type: 'change', listener: () => void) => listeners.add(listener),
    removeEventListener: (_type: 'change', listener: () => void) => listeners.delete(listener),
    resize: (next: boolean) => {
      query.matches = next
      listeners.forEach((listener) => listener())
    },
  }
  return query
}

export const exportPadAddresses = servedAddresses(exportPad)

const indexHtml = [
  '<h1 data-lines="1-1" id="invoice-export">Invoice export</h1>',
  '<p data-lines="3-4">The export job writes the paid invoices of each shop to a CSV file.',
  'The <a href="invoice-template.md#tax-number">invoice template</a> shows the tax number.</p>',
  '<h2 data-lines="6-6" id="retry-limit">Retry limit</h2>',
  '<p data-lines="8-8">The job retries <code>5</code> times. See <a href="#retry-limit">this section</a> and <a href="https://example.com/retries">the retry guide</a>.</p>',
  '<pre data-lines="10-12"><code class="language-ts">export const retryLimit = 5',
  '</code></pre>',
  '<table data-lines="14-17">',
  '<thead>',
  '<tr>',
  '<th>Shop</th>',
  '<th style="text-align:right">Retries</th>',
  '</tr>',
  '</thead>',
  '<tbody>',
  '<tr>',
  '<td>Bakery</td>',
  '<td style="text-align:right">3</td>',
  '</tr>',
  '</tbody>',
  '</table>',
  '<div class="html-block" data-lines="19-20"><ol class="export-steps"><li>Read the paid invoices</li></ol></div>',
  '<h3 data-lines="22-22" id="wait-between-retries">Wait between retries</h3>',
  '<p data-lines="24-24"><img src="steps.svg" alt="The 3 steps"></p>',
  '<!-- a comment of the page -->',
  '<h2 data-lines="26-26" id="will-the-export-job-retry-8-times">Will the export job retry 8 times?</h2>',
  '<div class="decision" data-decision="d-1" data-lines="28-32">',
  '<div class="decision-proposal"><p class="decision-label">Proposal</p><p>Raise the retry limit to <strong>8</strong>.</p></div>',
  '<div class="decision-alternative"><p class="decision-label">Alternative</p><p>Keep the retry limit at 5.</p></div>',
  '<div class="decision-pick"><p class="decision-label">Pick</p><p>proposal, because the network of a shop can be slow.</p></div>',
  '<div class="decision-buttons"><button type="button" data-choice="proposal">Proposal</button></div>',
  '</div>',
].join('\n')

export const indexPage: ViewedPage = {
  page: 'pages/index.md',
  title: 'Invoice export',
  html: indexHtml,
  headings: [
    { level: 1, text: 'Invoice export', id: 'invoice-export', line: 1 },
    { level: 2, text: 'Retry limit', id: 'retry-limit', line: 6 },
    { level: 3, text: 'Wait between retries', id: 'wait-between-retries', line: 22 },
    {
      level: 2,
      text: 'Will the export job retry 8 times?',
      id: 'will-the-export-job-retry-8-times',
      line: 26,
    },
  ],
  links: [
    {
      kind: 'page',
      href: 'invoice-template.md#tax-number',
      page: 'pages/invoice-template.md',
      headingId: 'tax-number',
    },
    { kind: 'page', href: '#retry-limit', page: 'pages/index.md', headingId: 'retry-limit' },
    { kind: 'other', href: 'https://example.com/retries' },
  ],
  decisions: [{ id: 'd-1', question: 'Will the export job retry 8 times?', answer: undefined }],
}

export const invoiceTemplatePage: ViewedPage = {
  page: 'pages/invoice-template.md',
  title: 'Invoice template',
  html: [
    '<h1 id="invoice-template">Invoice template</h1>',
    '<p>Each invoice shows the tax number of the shop.</p>',
    '<h2 id="tax-number">Tax number</h2>',
    '<p>A guest without a company doesn’t have a tax number.</p>',
    '<ul>',
    '<li>A company shows its number.</li>',
    '</ul>',
    '<h2 id="layout">Layout</h2>',
    '<p>Each invoice has one page.</p>',
  ].join('\n'),
  headings: [
    { level: 1, text: 'Invoice template', id: 'invoice-template', line: 1 },
    { level: 2, text: 'Tax number', id: 'tax-number', line: 3 },
    { level: 2, text: 'Layout', id: 'layout', line: 8 },
  ],
  links: [],
  decisions: [],
}

const firstRetryPage: ViewedPage = {
  page: 'pages/first-retry.md',
  title: 'First retry',
  html: [
    '<h1 id="first-retry">First retry</h1>',
    '<p>The first retry waits 30 seconds.</p>',
    '<h2 id="why-30-seconds">Why 30 seconds?</h2>',
    '<p>The storage of a shop is often back after 30 seconds.</p>',
  ].join('\n'),
  headings: [
    { level: 1, text: 'First retry', id: 'first-retry', line: 1 },
    { level: 2, text: 'Why 30 seconds?', id: 'why-30-seconds', line: 3 },
  ],
  links: [],
  decisions: [],
}

export const decisionLog: DecisionLogEntry[] = [
  {
    number: 1,
    time: '2026-11-20T09:30:00.000Z',
    source: 'chat',
    text: 'The export job runs every night.',
    decision: undefined,
  },
]

export const improvements: Improvements = {
  improvements: [
    {
      number: 1,
      time: '2026-11-20T21:30:00.000Z',
      title: 'The export command skips the custom files.',
      details: '## Steps\n\nRun the export of [the invoice template](invoice-template.md).',
      html: '<h2>Steps</h2>\n<p>Run the export of <a href="invoice-template.md">the invoice template</a>.</p>\n',
      links: [
        {
          kind: 'page',
          href: 'invoice-template.md',
          page: 'pages/invoice-template.md',
          headingId: undefined,
        },
      ],
    },
  ],
  notes: [
    {
      id: 'g-1',
      type: 'grammar',
      page: 'pages/index.md',
      text: 'Write who shows it.',
      time: '2026-11-20T21:10:00.000Z',
      outcome: undefined,
    },
  ],
}

export const retryQuestion: Thread = {
  id: 'c-1',
  type: 'comment',
  page: 'pages/index.md',
  anchor: {
    firstLine: 8,
    lastLine: 8,
    selectedText: 'retries 5 times',
    prefix: 'The job',
    suffix: '. See this section and the retry',
  },
  position: {
    kind: 'attached',
    firstLine: 8,
    lastLine: 8,
    text: 'retries 5 times',
    occurrence: 0,
    match: 'exact',
    score: 1,
  },
  waitsFor: 'nick',
  outcome: undefined,
  messages: [
    { author: 'nick', text: 'Is 5 retries enough?', time: '2026-11-20T21:09:00.000Z' },
    { author: 'agent', text: 'I have raised the limit to 8.', time: '2026-11-20T21:12:00.000Z' },
  ],
}

export const toneNote: Thread = {
  id: 'g-1',
  type: 'grammar',
  page: 'pages/index.md',
  anchor: {
    firstLine: 3,
    lastLine: 4,
    selectedText: 'shows the tax number',
    prefix: 'to a CSV file. The invoice template',
    suffix: '.',
  },
  position: {
    kind: 'attached',
    firstLine: 3,
    lastLine: 4,
    text: 'shows the tax number',
    occurrence: 0,
    match: 'exact',
    score: 1,
  },
  waitsFor: 'agent',
  outcome: undefined,
  messages: [{ author: 'nick', text: 'Write who shows it.', time: '2026-11-20T21:10:00.000Z' }],
}

export const indexInbox: NickInbox = {
  threads: [retryQuestion],
  decisions: [
    {
      page: 'pages/index.md',
      id: 'd-1',
      line: 28,
      question: 'Will the export job retry 8 times?',
      time: '2026-11-20T21:05:00.000Z',
      context: {
        lead: 'A slow network in the evening can make an upload fail. Read these in order:',
        links: [
          { text: 'The invoice template', page: 'pages/invoice-template.md', headingId: undefined },
          { text: 'The retry limit', page: 'pages/retry-limit.md', headingId: 'what-counts' },
        ],
      },
    },
  ],
}

export interface FakeConnection {
  readonly connection: ScratchPadConnection
  readonly pages: Map<string, ViewedPage>
  readonly threads: Map<string, Thread[]>
  readonly outbox: ReturnType<typeof fakeOutbox>['items']
  // The read marks that the fake returns. A test sets them to show new pages and changed sections.
  readonly readMarks: PageReadMark[]
  readonly sendChange: (change: PadChange) => void
  readonly sendConnection: (connected: boolean) => void
  readonly closeChanges: () => void
}

const fakeActions = {
  startThread: (thread: NewThread) =>
    Promise.resolve<Thread>({
      id: `${thread.type.slice(0, 1)}-9`,
      type: thread.type,
      page: thread.page,
      anchor: {
        firstLine: thread.firstLine,
        lastLine: thread.lastLine,
        selectedText: thread.selectedText,
        prefix: thread.prefix,
        suffix: thread.suffix,
      },
      position: {
        kind: 'attached',
        firstLine: thread.firstLine,
        lastLine: thread.lastLine,
        text: thread.selectedText,
        occurrence: 0,
        match: 'exact',
        score: 1,
      },
      waitsFor: 'agent',
      outcome: undefined,
      messages: [{ author: 'nick', text: thread.message, time: '2026-11-20T21:20:00.000Z' }],
    }),
  replyToThread: (id: string, message: string) =>
    Promise.resolve<Thread>({
      ...retryQuestion,
      id,
      waitsFor: 'agent',
      messages: [
        ...retryQuestion.messages,
        { author: 'nick', text: message, time: '2026-11-20T21:21:00.000Z' },
      ],
    }),
  resolveThread: (id: string) =>
    Promise.resolve<Thread>({ ...retryQuestion, id, waitsFor: 'nobody' }),
  answerDecision: () => Promise.resolve(),
  editImprovement: () => Promise.resolve(),
  deleteImprovement: () => Promise.resolve(),
}

export function fakeConnection(): FakeConnection {
  const pages = new Map([
    ['index.md', indexPage],
    ['invoice-template.md', invoiceTemplatePage],
    ['first-retry.md', firstRetryPage],
  ])
  const threads = new Map([['index.md', [retryQuestion, toneNote]]])
  const outbox = fakeOutbox(retryQuestion)
  const readMarks: PageReadMark[] = []
  const changeMark = (file: string, change: (mark: PageReadMark) => PageReadMark): void => {
    const index = readMarks.findIndex((mark) => mark.page === `pages/${file}`)
    const mark = readMarks[index]
    if (mark !== undefined) {
      readMarks[index] = change(mark)
    }
  }
  const listeners = new Set<ChangeListeners>()
  const closeChanges = vi.fn<() => void>()
  const connection: ScratchPadConnection = {
    pages: () => Promise.resolve(pageSummaries),
    page: (file) => {
      const page = pages.get(file)
      return page === undefined
        ? Promise.reject(new BrowserPageError(`There isn't any page called ${file}.`))
        : Promise.resolve(page)
    },
    threads: (file) => Promise.resolve(threads.get(file) ?? []),
    nickInbox: () => Promise.resolve(indexInbox),
    ...fakeActions,
    ...outbox.actions,
    progressTracker: () => Promise.resolve(progressTracker),
    decisionLog: () => Promise.resolve(decisionLog),
    improvements: () => Promise.resolve(improvements),
    readMarks: () => Promise.resolve({ pages: [...readMarks] }),
    threadsOfPad: () =>
      Promise.resolve(
        [...threads.values()].flat().map((thread) => ({ ...thread, resolvedTime: undefined })),
      ),
    markTaskDone: vi.fn(() => Promise.resolve()),
    markPageRead: vi.fn((file: string) => {
      changeMark(file, (mark) => ({ ...mark, state: 'read', changedSections: [] }))
      return Promise.resolve()
    }),
    markPageUnread: vi.fn((file: string) => {
      changeMark(file, (mark) => ({ ...mark, state: 'new', changedSections: [] }))
      return Promise.resolve()
    }),
    markSectionRead: vi.fn((file: string, section: SectionHash) => {
      changeMark(file, (mark) => ({
        ...mark,
        changedSections: mark.changedSections.filter((each) => each.id !== section.id),
      }))
      return Promise.resolve()
    }),
    onChange: (changeListeners) => {
      listeners.add(changeListeners)
      return () => {
        listeners.delete(changeListeners)
        closeChanges()
      }
    },
  }
  return {
    connection,
    pages,
    threads,
    outbox: outbox.items,
    readMarks,
    sendChange: (change) => listeners.forEach((listener) => listener.changed(change)),
    sendConnection: (connected) => listeners.forEach((listener) => listener.connection(connected)),
    closeChanges,
  }
}

export const exportedPadJson = JSON.stringify(
  {
    pages: pageSummaries,
    viewedPages: [indexPage, invoiceTemplatePage, firstRetryPage],
    threads: [retryQuestion, toneNote],
    progressTracker,
    decisionLog,
    improvements,
  },
  (_key, value: unknown) => value ?? null,
)
