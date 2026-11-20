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
    anchor: { firstLine: 6, lastLine: 6, selectedText: 'Each retry waits' },
    text: 'Write "waits for" here.',
  })
  nickAnswersDecision(folder, {
    page: 'pages/index.md',
    line: 9,
    question: 'Will the invoice template show the tax number?',
    answer: { choice: 'proposal' },
  })
}
