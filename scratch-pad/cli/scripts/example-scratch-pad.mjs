// The invented scratch pad that pnpm try and the screenshots of the browser page show. It contains
// an example of every feature that Nick checks on the browser page.
import { writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

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
    // Changes a page on the disk, as the agent does with its own tools
    changePage: (file, change) => {
      writeFileSync(join(home, pad, 'pages', file), change(examplePages[file]))
    },
  }
  for (const example of featureExamples) {
    await example.add(demo)
  }
}
