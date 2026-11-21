import { once } from 'node:events'
import { type Readable } from 'node:stream'
import { readAgentInbox } from '../agent-commands/inbox-commands'
import { addTaskToTracker } from '../agent-commands/progress-tracker-commands'
import { replyToThread } from '../agent-commands/thread-commands'
import { nickAnswersDecision, nickComments, nickReplies } from '../nick-actions/nick-actions'
import { ScratchPadError } from '../scratch-pad-error'
import { padSchema } from './pad-schema'
import { secondVersionPadSchema } from './pad-schema-fixtures'
import { ScratchPadFolder } from './scratch-pad-folder'

const writerNames = [
  'agent-adds-tasks',
  'agent-replies',
  'agent-reads-inbox',
  'agent-reads-decisions',
  'nick-comments',
  'nick-replies',
  'nick-answers-twice',
] as const
export type WriterName = (typeof writerNames)[number]

interface WriterRun {
  readonly folder: ScratchPadFolder
  readonly count: number
  readonly deadline: number
  readonly print: (line: string) => void
}

class WriterArgumentsError extends ScratchPadError {
  constructor(args: readonly string[]) {
    super(
      `"${args.join(' ')}" isn't a writer run. Pass the writer, the path of the scratch pad and the count.`,
    )
  }
}

const readInboxTimeoutMilliseconds = 10_000
const mainInbox = { types: ['comment', 'decision'], includeSeen: false } as const

function numbers(count: number): number[] {
  return Array.from({ length: count }, (_, index) => index + 1)
}

function readInboxUntilAllCommentsArePrinted(run: WriterRun): void {
  readInboxUntilPrinted(run, /^\[c-\d+\]/gm, (id) => id)
}

function readInboxUntilAllSecondAnswersArePrinted(run: WriterRun): void {
  readInboxUntilPrinted(run, /^\[d-\d+\](?=.*\n {2}Nick chose: second$)/gm, (id) => `${id}: second`)
}

function readInboxUntilPrinted(
  run: WriterRun,
  printedItem: RegExp,
  line: (id: string) => string,
): void {
  const printed = new Set<string>()
  while (printed.size < run.count && Date.now() < run.deadline) {
    Array.from(readAgentInbox(run.folder, mainInbox).matchAll(printedItem)).forEach((match) => {
      const id = match[0].slice(1, -1)
      printed.add(id)
      run.print(line(id))
    })
  }
}

const writers: Readonly<Record<WriterName, (run: WriterRun) => void>> = {
  'agent-adds-tasks': (run) =>
    numbers(run.count).forEach((n) => addTaskToTracker(run.folder, `Export batch ${n}`)),
  'agent-replies': (run) =>
    numbers(run.count).forEach((n) => replyToThread(run.folder, 'c-1', `Agent reply ${n}`)),
  'agent-reads-inbox': readInboxUntilAllCommentsArePrinted,
  'agent-reads-decisions': readInboxUntilAllSecondAnswersArePrinted,
  'nick-comments': (run) =>
    numbers(run.count).forEach((n) =>
      nickComments(run.folder, {
        type: 'comment',
        page: 'index',
        anchor: { firstLine: 1, lastLine: 1, selectedText: 'Export job', prefix: '', suffix: '' },
        text: `Check batch ${n}`,
      }),
    ),
  'nick-replies': (run) =>
    numbers(run.count).forEach((n) => nickReplies(run.folder, 'c-1', `Nick reply ${n}`)),
  'nick-answers-twice': (run) =>
    numbers(run.count).forEach((n) =>
      ['first', 'second'].forEach((choice) =>
        nickAnswersDecision(run.folder, {
          id: `d-${n}`,
          page: 'index',
          line: 3,
          question: `Retry batch ${n}?`,
          answer: { choice },
        }),
      ),
    ),
}

function runWriter(writer: WriterName, run: WriterRun): void {
  writers[writer](run)
}

export async function runWriterProcess(
  args: readonly string[],
  go: Readable,
  print: (line: string) => void,
): Promise<void> {
  const [writerText, padPath, countText, schemaText] = args
  const writer = writerNames.find((name) => name === writerText)
  if (writer === undefined || padPath === undefined || countText === undefined) {
    throw new WriterArgumentsError(args)
  }
  print('ready')
  await once(go, 'data')
  runWriter(writer, {
    folder: new ScratchPadFolder(
      padPath,
      schemaText === 'second-version' ? secondVersionPadSchema : padSchema,
    ),
    count: Number(countText),
    deadline: Date.now() + readInboxTimeoutMilliseconds,
    print,
  })
}
