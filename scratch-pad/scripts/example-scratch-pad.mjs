// The invented scratch pad that the screenshots of the browser page show.

export const indexPage = `# Invoice export

The export job writes the paid invoices of each shop to a CSV file every night. The [invoice template](invoice-template.md#tax-number) shows the tax number of each shop. The [retry limit](retry-limit.md) sets how often the job tries a failed shop again.

## How the job runs

The job reads the paid invoices of the day. It then writes one file per shop and uploads the file to the storage of the shop.

| Step | What the job does | Time |
|---|---|--:|
| Read | Reads the paid invoices of the day from \`invoices\` | 2 min |
| Write | Writes one CSV file per shop with \`toCsv\` | 5 min |
| Upload | Uploads each file to the storage of the shop | 3 min |

The code of one shop is short:

\`\`\`ts
export async function exportShop(shop: Shop): Promise<ExportResult> {
  const invoices = await paidInvoices(shop.id, today())
  // A shop without any invoices still receives an empty file.
  return uploadCsv(shop, toCsv(invoices), { retries: retryLimit })
}
\`\`\`

:::html
<div style="display:flex;gap:var(--space-md);font-family:var(--font-ui);font-size:var(--fs-ui);line-height:var(--lh-ui)">
  <p style="flex:1;margin:0;padding:var(--space-xl);border-radius:var(--r-md);background:var(--accent-pale);color:var(--state-done)">1. Read the paid invoices</p>
  <p style="flex:1;margin:0;padding:var(--space-xl);border-radius:var(--r-md);background:var(--tint);color:var(--text)">2. Write one CSV file per shop</p>
  <p style="flex:1;margin:0;padding:var(--space-xl);border-radius:var(--r-md);background:var(--tint);color:var(--text)">3. Upload each file</p>
</div>
:::

### What a shop sees

> Your invoices for March are ready. The file is in your storage.

## Will the export job retry 8 times?

The network of a small shop can be slow in the evening, so 5 retries aren't always enough.

:::decision d-1
proposal: Raise the retry limit to 8.
alternative: Keep the retry limit at 5.
pick: proposal, because the network of a shop can be slow.
:::

## What happens next

1. The agent will change the retry limit once Nick has decided.
2. The job will run with the new limit on the next night.
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

export const retryLimitPage = `# Retry limit

The export job retries a failed shop 5 times. Each retry waits twice as long as the retry before it.

## What counts as a failure

A failure is a timeout of the storage of the shop or an error of the network. A shop without any invoices isn't a failure.

## What the agent logs

The agent logs one line for each retry with the id of the shop and the number of the retry.
`

const waitBetweenRetriesPage = `# Wait between retries

The first retry waits 30 seconds. The fifth retry waits 8 minutes, because each retry waits twice as long as the retry before it.

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

// The file name of each page in the pages folder of the example
export const examplePages = {
  'index.md': indexPage,
  '1-invoice-template.md': invoiceTemplatePage,
  '2-retry-limit.md': retryLimitPage,
  '2.1-wait-between-retries.md': waitBetweenRetriesPage,
  '2.1.1-first-retry.md': firstRetryPage,
}
