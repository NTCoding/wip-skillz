import { existsSync } from 'node:fs'
import process from 'node:process'
import { readAgentInbox } from '../agent-commands/inbox-commands'
import { addTaskToTracker } from '../agent-commands/progress-tracker-commands'
import { replyToThread } from '../agent-commands/thread-commands'
import { nickAnswersDecision, nickComments, nickReplies } from '../nick-actions/nick-actions'
import { ScratchPadFolder } from './scratch-pad-folder'

const [writer, padPath, countText, goFile] = process.argv.slice(2)
const folder = new ScratchPadFolder(padPath)
const count = Number(countText)
const numbers = Array.from({ length: count }, (_, index) => index + 1)
const mainInbox = { types: ['comment', 'decision'], includeSeen: false }

function readInboxUntilAllCommentsArePrinted() {
  const printed = new Set()
  const deadline = Date.now() + 10_000
  while (printed.size < count && Date.now() < deadline) {
    const ids = readAgentInbox(folder, mainInbox).match(/^\[c-\d+\]/gm) ?? []
    ids.forEach((id) => {
      printed.add(id)
      process.stdout.write(`${id.slice(1, -1)}\n`)
    })
  }
}

function readInboxUntilAllSecondAnswersArePrinted() {
  const printed = new Set()
  const deadline = Date.now() + 10_000
  while (printed.size < count && Date.now() < deadline) {
    const text = readAgentInbox(folder, mainInbox)
    Array.from(text.matchAll(/^\[(d-\d+)\].*\n {2}Nick chose: (.*)$/gm)).forEach(
      ([, id, choice]) => {
        if (choice === 'second') {
          printed.add(id)
        }
        process.stdout.write(`${id}: ${choice}\n`)
      },
    )
  }
}

const writers = {
  'agent-adds-tasks': () => numbers.forEach((n) => addTaskToTracker(folder, `Export batch ${n}`)),
  'agent-replies': () => numbers.forEach((n) => replyToThread(folder, 'c-1', `Agent reply ${n}`)),
  'agent-reads-inbox': readInboxUntilAllCommentsArePrinted,
  'agent-reads-decisions': readInboxUntilAllSecondAnswersArePrinted,
  'nick-comments': () =>
    numbers.forEach((n) =>
      nickComments(folder, {
        type: 'comment',
        page: 'index',
        anchor: { firstLine: 1, lastLine: 1, selectedText: 'Export job' },
        text: `Check batch ${n}`,
      }),
    ),
  'nick-replies': () => numbers.forEach((n) => nickReplies(folder, 'c-1', `Nick reply ${n}`)),
  'nick-answers-twice': () =>
    numbers.forEach((n) =>
      ['first', 'second'].forEach((choice) =>
        nickAnswersDecision(folder, {
          page: 'index',
          line: 3,
          question: `Retry batch ${n}?`,
          answer: { choice },
        }),
      ),
    ),
}

process.stdout.write('ready\n')
while (!existsSync(goFile)) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1)
}
writers[writer]()
