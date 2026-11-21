import { nickAnswersDecision, nickComments } from '../nick-actions/nick-actions'
import { type ScratchPadFolder } from '../scratch-pad-folder/scratch-pad-folder'
import { retryAnchor } from '../threads/thread-fixtures'

export function commentAndGrammarNoteAndDecision(folder: ScratchPadFolder): void {
  nickComments(folder, {
    type: 'comment',
    page: 'pages/index.md',
    anchor: retryAnchor,
    text: 'Is 5 retries enough on a slow network?',
  })
  nickComments(folder, {
    type: 'grammar',
    page: 'pages/index.md',
    anchor: {
      firstLine: 5,
      lastLine: 6,
      selectedText: 'Each retry waits',
      prefix: 'The export job retries 5 times.',
      suffix: '30 seconds.',
    },
    text: 'Write "waits for" here.',
  })
  nickAnswersDecision(folder, {
    id: 'd-1',
    page: 'pages/index.md',
    line: 9,
    question: 'Will the invoice template show the tax number?',
    answer: { choice: 'proposal' },
  })
}
