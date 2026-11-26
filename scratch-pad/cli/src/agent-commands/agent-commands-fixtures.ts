import { nickAnswersDecision, nickComments, nickCommentsOnTask } from '../nick-actions/nick-actions'
import { trackerWithSubtasks } from '../progress-tracker/progress-tracker-fixtures'
import { assignSubtask } from '../progress-tracker/task-assignments'
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

// Subtask 2.2, whose id is t-5, is assigned to Nick. Nick has started the thread c-1 on it.
export function threadOnAssignedSubtask(folder: ScratchPadFolder): void {
  const tracker = assignSubtask(
    trackerWithSubtasks(['done', 'in-progress']),
    { task: 2, subtask: 2 },
    { do: 'Check the log of the export job', why: "The agent can't read the log" },
  ).tracker
  folder.change((pad) => pad.writeProgressTracker(tracker))
  nickCommentsOnTask(folder, 't-5', 'Which log should I check?')
}
