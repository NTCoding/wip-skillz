import { type ProgressTracker } from './api-responses'

function pageLink(href: string, page: string, headingId?: string) {
  return { kind: 'page' as const, href, page, headingId }
}

// An assignment without any links in its texts, in the format that is returned by the server
export function assignmentOf(what: string, why: string) {
  return {
    assignee: 'user' as const,
    do: what,
    why,
    doHtml: `<p>${what}</p>\n`,
    whyHtml: `<p>${why}</p>\n`,
    links: [],
  }
}

// Task 2 has 2 subtasks. Subtask 2.2 is assigned to Nick. The description of task 1 links to the
// first retry, which is page 2.1.1. The description of task 3 links to the retry limit, which is
// page 2 above the first retry. The description of subtask 2.1 links to the invoice template.
export const progressTracker: ProgressTracker = {
  title: 'Invoice export',
  goal: 'Ship the invoice export job.',
  tasks: [
    {
      id: 't-1',
      number: 1,
      title: 'Design the export job',
      state: 'done',
      html: '<ul>\n<li>The first retry waits 30 seconds, which is explained in <a href="first-retry.md">the first retry</a>.</li>\n</ul>\n',
      links: [pageLink('first-retry.md', 'pages/first-retry.md')],
      assignment: undefined,
      subtasks: [],
    },
    {
      id: 't-2',
      number: 2,
      title: 'Write the invoice template',
      state: 'in-progress',
      html: undefined,
      links: [],
      assignment: undefined,
      subtasks: [
        {
          id: 't-4',
          number: '2.1',
          title: 'Show the tax number',
          state: 'done',
          html: '<p>The tax number is on <a href="invoice-template.md">the invoice template</a>.</p>\n',
          links: [pageLink('invoice-template.md', 'pages/invoice-template.md')],
          assignment: undefined,
        },
        {
          id: 't-5',
          number: '2.2',
          title: 'Show the bank details',
          state: 'in-progress',
          html: undefined,
          links: [],
          assignment: assignmentOf(
            'Ask the bank for the IBAN of the shop',
            "The agent can't call the bank",
          ),
        },
      ],
    },
    {
      id: 't-3',
      number: 3,
      title: 'Check the retry limit',
      state: 'to-do',
      html: '<p>The limit is on <a href="retry-limit.md">the retry limit</a> and <a href="invoice-template.md#the-logo">the logo</a> waits.</p>\n',
      links: [
        pageLink('retry-limit.md', 'pages/retry-limit.md'),
        pageLink('invoice-template.md#the-logo', 'pages/invoice-template.md', 'the-logo'),
      ],
      assignment: undefined,
      subtasks: [],
    },
  ],
}
