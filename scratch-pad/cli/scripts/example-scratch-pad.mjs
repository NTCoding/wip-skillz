// The invented scratch pad that pnpm try and the screenshots of the browser page show. It contains
// an example of every feature that Nick checks on the browser page.
import { execFileSync } from 'node:child_process'
import {
  closeSync,
  mkdtempSync,
  openSync,
  readFileSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

// Returns a function that runs the built tool `tool` with the words it's passed, as the agent does,
// and returns what the tool printed. If the last argument is { input }, the tool reads the input
// from standard input, like a heredoc. The tool only reads standard input from a file or a pipe,
// but Node connects a child process to a socket. That's why the input is written to a file first.
export function toolRunner(tool, environment) {
  return (...words) => {
    const last = words.at(-1)
    if (typeof last !== 'object') {
      return execFileSync(process.execPath, [tool, ...words], {
        env: environment,
        encoding: 'utf8',
      })
    }
    const folder = mkdtempSync(join(tmpdir(), 'scratch-pad-input-'))
    writeFileSync(join(folder, 'input.md'), last.input)
    const input = openSync(join(folder, 'input.md'), 'r')
    try {
      return execFileSync(process.execPath, [tool, ...words.slice(0, -1)], {
        env: environment,
        encoding: 'utf8',
        stdio: [input, 'pipe', 'inherit'],
      })
    } finally {
      closeSync(input)
      rmSync(folder, { recursive: true, force: true })
    }
  }
}

export const indexPage = `# Invoice export

The export job will write the paid invoices of each shop to a CSV file every night. This scratch pad describes how the job will work before anybody builds it.

[How the job runs](how-the-job-runs.md) describes the steps of one night, from the invoices of the day to the file in the storage of each shop. The [retry limit](retry-limit.md) describes how often the job tries a shop again after a failure. The pages under the retry limit describe the wait between 2 retries.

The [invoice template](invoice-template.md#tax-number) describes what each invoice shows, like the tax number of the shop. Each page in the list below describes one part of the export job.
`

const howTheJobRunsPage = `# How the job runs

The export job runs once a night and handles every shop in 3 steps.

## The steps

The job reads the paid invoices of the day. It then writes one file per shop and uploads the file to the storage of the shop.

| Step | What the job does | Time |
|---|---|--:|
| Read | Reads the paid invoices of the day from \`invoices\` | 2 min |
| Write | Writes one CSV file per shop with \`toCsv\` | 5 min |
| Upload | Uploads each file to the storage of the shop | 3 min |

:::html
<div style="display:flex;gap:var(--space-md);font-family:var(--font-ui);font-size:var(--fs-ui);line-height:var(--lh-ui)">
  <p style="flex:1;margin:0;padding:var(--space-xl);border-radius:var(--r-md);background:var(--accent-pale);color:var(--state-done)">1. Read the paid invoices</p>
  <p style="flex:1;margin:0;padding:var(--space-xl);border-radius:var(--r-md);background:var(--tint);color:var(--text)">2. Write one CSV file per shop</p>
  <p style="flex:1;margin:0;padding:var(--space-xl);border-radius:var(--r-md);background:var(--tint);color:var(--text)">3. Upload each file</p>
</div>
:::

## The code for one shop

The code for one shop is short:

\`\`\`ts
export async function exportShop(shop: Shop): Promise<ExportResult> {
  const invoices = await paidInvoices(shop.id, today())
  // A shop without any invoices still receives an empty file.
  return uploadCsv(shop, toCsv(invoices), { retries: retryLimit })
}
\`\`\`

### What a shop sees

> Your invoices for March are ready. The file is in your storage.

## Will the export job retry 8 times?

The network of a small shop can be slow in the evening. That's why 5 retries aren't always enough.

:::decision d-1
context: A slow network in the evening can make an upload fail. Read these in order:
  1. [The steps](#the-steps) show where the upload happens.
  2. [The retry limit](retry-limit.md) explains why the limit is 5 today.
proposal: Raise the retry limit to 8.
alternative: Keep the retry limit at 5.
pick: proposal, because the network of a shop can be slow.
:::
`

export const retryLimitPage = `# Retry limit

The export job retries a failed shop 5 times. Each retry waits twice as long as the retry before it.

## What counts as a failure

A failure is a timeout of the storage of the shop or an error of the network. A shop without any invoices isn't a failure.

## What the agent logs

The agent logs one line for each retry with the id of the shop and the number of the retry.
`

const waitBetweenRetriesPage = `# Wait between retries

The first retry waits 30 seconds. The fifth retry waits 8 minutes, because each retry waits twice as long as the retry before it.

:::agent-note
I haven't measured how long the storage of a shop takes to come back after a timeout. The waits on this page are based on the timeouts in the logs of last month.
:::

## Will the wait stop at 10 minutes?

A retry limit of 8 would make the last retry wait more than an hour.

:::decision d-2
context: The job has to finish before the shops open in the morning. Read these in order:
  1. [Timeout of the storage](storage-timeout.md) explains how long a shop takes to come back.
  2. [The steps](how-the-job-runs.md#the-steps) show how long one night of the job takes.
proposal: Stop the wait at 10 minutes.
alternative: Keep doubling the wait.
pick: proposal, because the job has to finish before the shops open.
:::
`

const firstRetryPage = `# First retry

The first retry waits 30 seconds after the shop has failed.

## Why 30 seconds

The storage of a shop is often back after a short timeout. A wait of 30 seconds is long enough for most of them.

## What the agent logs

The agent logs the id of the shop and the time of the first retry.
`

const storageTimeoutPage = `# Timeout of the storage

The storage of a shop times out after 20 seconds. The first retry starts 30 seconds after that timeout.

## Why 20 seconds

The storage service of the shops closes every connection that has been quiet for 20 seconds.
`

export const invoiceTemplatePage = `# Invoice template

Each invoice uses one template. The template is the same for every shop.

## Tax number

Each invoice shows the tax number of the shop at the top right. A guest without a company doesn't have a tax number, so the line is left out.

- A company shows its number with the prefix of its country.
- A guest sees the word "Private" instead.

## Layout

Each invoice has one page. A long invoice continues on a second page with the same header.

## Fonts

The template uses the fonts of the shop. A shop without its own fonts uses the default fonts.

## Footer

The footer shows the address of the shop and the bank details.
`

const invoiceNumbersPage = `# Invoice numbers

Each shop numbers its own invoices. The export job copies the number of each invoice into the CSV file without changing it.

## Gaps in the numbers

A cancelled invoice keeps its number. That's why the numbers in a file can have gaps.
`

// The file name of each page in the pages folder of the example
export const examplePages = {
  'index.md': indexPage,
  '1-how-the-job-runs.md': howTheJobRunsPage,
  '2-retry-limit.md': retryLimitPage,
  '2.1-wait-between-retries.md': waitBetweenRetriesPage,
  '2.1.1-first-retry.md': firstRetryPage,
  '2.1.1.1-storage-timeout.md': storageTimeoutPage,
  '3-invoice-template.md': invoiceTemplatePage,
  '3.1-invoice-numbers.md': invoiceNumbersPage,
}

// Creates the invented scratch pad in the folder `home` and returns the name of its folder. The
// server doesn't have to run yet. `run` runs the built tool with the words it's passed and returns
// what the tool printed.
export function createExampleScratchPad(run, home) {
  const pad = basename(
    run('new', 'Invoice export')
      .split('\n')[0]
      .replace(/^created /, ''),
  )
  const runInPad = (...words) => run('--pad', pad, ...words)
  runInPad('goal', 'Ship the invoice export job.')
  runInPad('task', 'add', 'Design the export job')
  runInPad('task', 'add', 'Write the invoice template')
  runInPad('task', 'add', 'Check the retry limit')
  runInPad('task', 'start', '1')
  runInPad('task', 'done', '1')
  runInPad('decide', 'The export job runs every night.')
  runInPad('decide', 'A guest without a company sees the word Private.')
  const pages = join(home, pad, 'pages')
  for (const [file, markdown] of Object.entries(examplePages)) {
    writeFileSync(join(pages, file), markdown)
  }
  return pad
}

// The id of a page is its file name without the number, like pages/retry-limit.md.
function pageOf(file) {
  return `pages/${file.replace(/^[\d.]+-/, '')}`
}

// The anchor that the browser sends for a selection of `selectedText` in the page `file`. Each
// selected text in the examples is in a paragraph on one line.
function anchorOf(file, selectedText) {
  const lines = examplePages[file].split('\n')
  const index = lines.findIndex((line) => line.includes(selectedText))
  const [prefix, suffix] = lines[index].split(selectedText)
  return {
    firstLine: index + 1,
    lastLine: index + 1,
    selectedText,
    prefix: prefix.trim(),
    suffix: suffix.trim(),
  }
}

const minute = 60_000

// The examples of the features that Nick checks on the demo, in the order they're added. The
// agent's part of each example is made with the agent's commands. Nick's part is made with the API
// of the browser page, in the same way as the browser makes it. The only exception is writtenAgo,
// which changes the time of a message in pad.db directly. The API always stamps a message with the
// current time, so a comment that has waited for a while can't be made through the API. Add an
// example to this list for every new feature.
const featureExamples = [
  {
    feature: 'A comment that the agent has replied to, which waits for Nick',
    add: async (demo) => {
      await demo.comment('comment', '1-how-the-job-runs.md', {
        selectedText: 'uploads the file to the storage of the shop',
        message: 'Does the upload retry with the same limit as the export job?',
      })
      demo.agent(
        'reply',
        'c-1',
        'Yes. The upload uses the retry limit of the job, so it will retry 8 times too.',
      )
    },
  },
  {
    feature: 'A comment that has waited for the agent for longer than 15 minutes',
    add: async (demo) => {
      await demo.comment('comment', '2-retry-limit.md', {
        selectedText: "A shop without any invoices isn't a failure.",
        message: 'Does a shop without any invoices still receive an empty file?',
      })
      demo.writtenAgo('c-2', 40 * minute)
    },
  },
  {
    feature: 'A resolved comment',
    add: async (demo) => {
      await demo.comment('comment', '3-invoice-template.md', {
        selectedText: 'the line is left out',
        message: 'Is the line left out for a company outside the EU too?',
      })
      demo.agent(
        'reply',
        'c-3',
        'No. A company outside the EU shows the number of its own country.',
      )
      await demo.post('threads/c-3/resolve', {})
    },
  },
  {
    feature: 'A grammar note that waits for a subagent',
    add: async (demo) => {
      await demo.comment('grammar', '2.1.1-first-retry.md', {
        selectedText: 'most of them',
        message: 'Write which shops “them” means.',
      })
    },
  },
  {
    feature: 'A decision that Nick has answered, which is shown in the margin',
    add: async (demo) => {
      await demo.post('decisions/d-1', {
        page: pageOf('1-how-the-job-runs.md'),
        choice: 'proposal',
      })
    },
  },
  {
    feature: 'A comment and a reply in the outbox',
    add: async (demo) => {
      await demo.post('outbox/comments', {
        type: 'comment',
        page: pageOf('2.1-wait-between-retries.md'),
        ...anchorOf('2.1-wait-between-retries.md', 'more than an hour'),
        message: 'Is an hour a problem if the job starts at 02:00?',
      })
      await demo.post('outbox/replies', {
        thread: 'c-1',
        message: 'Then the upload can log its retries in the same line as the export job.',
      })
    },
  },
  {
    feature:
      'The search, where ⌘K and “retry” find a line on most pages, and “limit.md” only finds the address of a link on the index page, which the page scrolls to without a highlight',
    // The pages of the demo already contain both searches, so this example doesn't change anything.
    add: () => undefined,
  },
  {
    feature: 'A new page, and a read page whose section has changed',
    add: async (demo) => {
      const { pages } = await demo.get('read-marks')
      for (const page of pages.filter((each) => each.page !== pageOf('3.1-invoice-numbers.md'))) {
        await demo.post(`pages/${encodeURIComponent(page.page.replace(/^pages\//, ''))}/read`, {
          sections: page.sections,
        })
      }
      demo.changePage('3-invoice-template.md', (markdown) =>
        markdown.replace(
          'continues on a second page with the same header.',
          'continues on a second page with the same header. The total is only shown on the last page.',
        ),
      )
    },
  },
  {
    feature:
      'The Inbox with 2 decisions and a reply that need an answer, above the collapsed updates to a page with several changed sections, a page with one changed section and a new page',
    add: async (demo) => {
      demo.changePage('3-invoice-template.md', (markdown) =>
        markdown
          .replace('at the top right.', 'at the top right, under the logo of the shop.')
          .replace('uses the default fonts.', 'uses the default fonts of the export job.')
          .replace('and the bank details.', 'and the bank details of the shop.'),
      )
      demo.changePage(
        '2-retry-limit.md',
        (markdown) => `${markdown}
## Will the job tell the team after the last retry?

The team only reads the log in the morning. That's why a shop that fails every retry can wait a whole day for its file.

:::decision d-3
context: A shop that fails every retry can wait a whole day for its file. Read these in order:
  1. [What counts as a failure](#what-counts-as-a-failure) explains when the job retries a shop.
  2. [What the agent logs](#what-the-agent-logs) shows what the team reads in the morning.
proposal: Send an email to the team after the last retry.
alternative: Only write the failure to the log.
pick: proposal, because a shop expects its file in the morning.
:::
`,
      )
    },
  },
  {
    feature:
      'The decisions and the replies in the Inbox sorted together by time, with decision d-2 older than the reply of the agent and decision d-3 newer',
    add: async (demo) => {
      demo.writtenAgo('c-1', 30 * minute)
      demo.savedAgo('2.1-wait-between-retries.md', 2 * 60 * minute)
    },
  },
  {
    feature:
      'A resolved comment with 4 messages, which is shown as its marker in the margin above the card of the open comment c-1',
    add: async (demo) => {
      await demo.comment('comment', '1-how-the-job-runs.md', {
        selectedText: 'handles every shop in 3 steps',
        message: 'Does the job handle the shops one after another or all at the same time?',
      })
      demo.agent('reply', 'c-4', 'One after another, so a slow shop delays the shops after it.')
      await demo.post('threads/c-4/replies', {
        message: 'Can a slow shop make the job run past the morning?',
      })
      demo.agent(
        'reply',
        'c-4',
        'No. Each shop has a limit of 10 minutes. The job moves on to the next shop once the limit is reached.',
      )
      await demo.post('threads/c-4/resolve', {})
    },
  },
  {
    feature:
      "The descriptions of the first 2 tasks below the list of tasks on the progress tracker, whose titles link to them. The last task doesn't have a description.",
    add: async (demo) => {
      demo.agent('task', 'describe', '1', {
        input: `- The job runs once a night in 3 steps, which are listed in [how the job runs](how-the-job-runs.md#the-steps).
- A slow shop can make an upload fail. [The retry limit](retry-limit.md) explains when the job tries a shop again.
- Nick has decided to raise the retry limit to 8 in [the decision about the retry limit](how-the-job-runs.md#will-the-export-job-retry-8-times).
`,
      })
      demo.agent('task', 'describe', '2', {
        input: `- Every shop uses the same template, which is described in [the invoice template](invoice-template.md).
- A guest without a company doesn't have a tax number, so [the tax number](invoice-template.md#tax-number) is left out.
- The export copies the number of each invoice without changing it, as explained in [the invoice numbers](invoice-numbers.md).
`,
      })
    },
  },
  {
    feature:
      'Task 4 "Build the export job" with 3 subtasks in mixed states. Its chevron on the progress tracker shows 4.1 done, 4.2 in progress and 4.3 to do. The description of subtask 4.1 is in a collapsed section inside the collapsed section of task 4.',
    add: async (demo) => {
      demo.agent('task', 'add', 'Build the export job')
      demo.agent('subtask', 'add', '4', 'Retry a failed export')
      demo.agent('subtask', 'add', '4', 'Log each retry')
      demo.agent('subtask', 'add', '4', 'Alert the team after the last retry')
      demo.agent('subtask', 'start', '4.1')
      demo.agent('subtask', 'done', '4.1')
      demo.agent('subtask', 'describe', '4.1', {
        input: `- A failed shop is tried again after a wait, which is explained in [the wait between retries](wait-between-retries.md#will-the-wait-stop-at-10-minutes).
- Each retry is one line of the log, which is the next subtask <task:t-6>.
`,
      })
    },
  },
  {
    feature:
      'Task 2 "Agree the retry limit with Jo", which was added as task 5 and then moved before the invoice template. The tasks after it were numbered again, so the export job is task 5 with the subtasks 5.1 to 5.3.',
    add: async (demo) => {
      demo.agent('task', 'add', 'Agree the retry limit with Jo')
      demo.agent('task', 'move', '5', '--before', '2')
    },
  },
  {
    feature:
      'The chips "Part of task" at the top of the retry limit and of each page below it, like the first retry. Task 1 and task 4 "Check the retry limit" both link to the retry limit, so each of those pages shows 2 chips. Task 1 also links to a heading of how the job runs, which doesn\'t count.',
    add: async (demo) => {
      demo.agent('task', 'describe', '4', {
        input: `- The job retries a failed shop 5 times, which is explained in [the retry limit](retry-limit.md).
`,
      })
    },
  },
  {
    feature:
      'A task reference on the new page invoice numbers, which shows the current number and title of the task "3 Write the invoice template" as a link to the task on the progress tracker. The task was task 2 when the reference was written.',
    add: async (demo) => {
      demo.changePage(
        '3.1-invoice-numbers.md',
        (markdown) => `${markdown}
The template that shows the numbers is built in <task:t-2>.
`,
      )
    },
  },
  {
    feature:
      'The title of the tab, which switches to "(3) Waiting for you · Invoice export" for 3 seconds every 15 seconds while Nick looks at another tab or another app. The count is the count on the Inbox button.',
    // The decisions and the reply that the examples above add already wait for Nick. That's why
    // this example doesn't need to add anything.
    add: async () => {},
  },
]

// Adds every example of `featureExamples` to the scratch pad `pad` while its server is running at
// `address`, like http://127.0.0.1:4800/.
export async function addFeatureExamples({ run, home, pad, address }) {
  const api = `${address}api/scratch-pads/${encodeURIComponent(pad)}/`
  const request = async (path, init) => {
    const response = await fetch(`${api}${path}`, init)
    if (!response.ok) {
      throw new Error(
        `${init?.method ?? 'GET'} ${path} returned ${response.status}: ${await response.text()}`,
      )
    }
    return response.json()
  }
  const post = (path, body) =>
    request(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
  const demo = {
    agent: (...words) => run('--pad', pad, ...words),
    get: (path) => request(path),
    post,
    comment: (type, file, { selectedText, message }) =>
      post('threads', { type, page: pageOf(file), ...anchorOf(file, selectedText), message }),
    // Moves the time of every message of a thread back, as if Nick had written it earlier
    writtenAgo: (thread, milliseconds) => {
      const database = new DatabaseSync(join(home, pad, 'pad.db'), { timeout: 5000 })
      try {
        database
          .prepare('UPDATE messages SET time = ? WHERE thread_id = ?')
          .run(new Date(Date.now() - milliseconds).toISOString(), thread)
      } finally {
        database.close()
      }
    },
    // Moves the time that a page was last written back, as if the agent had saved the page earlier.
    // When the server first finds a decision, it records the time that the page of the decision was
    // last written as the time of the decision. That's why this only changes the time of a decision
    // that the server hasn't found yet.
    savedAgo: (file, milliseconds) => {
      const saved = new Date(Date.now() - milliseconds)
      utimesSync(join(home, pad, 'pages', file), saved, saved)
    },
    // Changes a page on the disk, as the agent does with its own tools. `change` is passed the
    // text that is on the disk now so that an example can change a page again after an earlier
    // example.
    changePage: (file, change) => {
      const path = join(home, pad, 'pages', file)
      writeFileSync(path, change(readFileSync(path, 'utf8')))
    },
  }
  for (const example of featureExamples) {
    await example.add(demo)
  }
}
