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

export function writeInvoiceDecisionsPage(folder: ScratchPadFolder): void {
  writeFileInPad(folder, 'pages/invoice-decisions.md', invoiceDecisionsPage)
}

export function nickAnswersRetryQuestion(folder: ScratchPadFolder): void {
  nickAnswersDecision(folder, {
    page: 'pages/invoice-decisions.md',
    line: 5,
    question: retryQuestion,
    answer: { choice: 'proposal' },
  })
}
