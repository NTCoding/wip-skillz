import { utimesSync } from 'node:fs'
import { join } from 'node:path'
import { nickAnswersDecision } from '../nick-actions/nick-actions'
import { writeFileInPad } from '../scratch-pad-folder/scratch-pad-folder-fixtures'
import { type ScratchPadFolder } from '../scratch-pad-folder/scratch-pad-folder'

export const retryQuestion = 'Will the export job retry 8 times?'
export const taxQuestion = 'Should the invoice template show the tax number?'

const invoiceDecisionsPage = [
  '# Invoice decisions',
  '',
  `## ${retryQuestion}`,
  '',
  ':::decision d-1',
  'proposal: Raise the retry limit to 8.',
  'alternative: Keep the retry limit at 5.',
  'pick: proposal',
  ':::',
  '',
  `## ${taxQuestion}`,
  '',
  ':::decision d-2',
  'proposal: Show the tax number only for companies.',
  'alternative: Show the tax number for everybody.',
  'pick: proposal',
  ':::',
  '',
].join('\n')

const retryChoicesPage = [
  '# Retry choices',
  '',
  `## ${retryQuestion}`,
  '',
  ':::decision d-3',
  'proposal: Raise the retry limit to 8.',
  'alternative: Keep the retry limit at 5.',
  'pick: proposal',
  ':::',
  '',
  ':::decision d-4',
  'proposal: Wait 30 seconds between the retries.',
  'alternative: Wait 60 seconds between the retries.',
  'pick: proposal',
  ':::',
  '',
].join('\n')

export function writeRetryChoicesPage(folder: ScratchPadFolder): void {
  writeFileInPad(folder, 'pages/retry-choices.md', retryChoicesPage)
}

// The time that the file of the page with the invoice decisions was last written
export const invoiceDecisionsSavedTime = '2026-03-14T09:00:00.000Z'

export function writeInvoiceDecisionsPage(folder: ScratchPadFolder): void {
  writeFileInPad(folder, 'pages/invoice-decisions.md', invoiceDecisionsPage)
  const saved = new Date(invoiceDecisionsSavedTime)
  utimesSync(join(folder.path, 'pages/invoice-decisions.md'), saved, saved)
}

export function nickAnswersRetryQuestion(folder: ScratchPadFolder): void {
  nickAnswersDecision(folder, {
    id: 'd-1',
    page: 'pages/invoice-decisions.md',
    line: 5,
    question: retryQuestion,
    answer: { choice: 'proposal' },
  })
}
