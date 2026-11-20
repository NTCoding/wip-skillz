import { checkPages } from '../agent-commands/check-commands'
import { readAgentInbox, scratchPadStatus } from '../agent-commands/inbox-commands'
import { logDecisionFromChat } from '../agent-commands/decision-log-commands'
import { listPages, outlinePage } from '../agent-commands/page-commands'
import {
  addTaskToTracker,
  finishTaskInTracker,
  listTasks,
  setGoalOfScratchPad,
  startTaskInTracker,
} from '../agent-commands/progress-tracker-commands'
import { finishNoteThread, replyToThread, showItem } from '../agent-commands/thread-commands'
import { type ScratchPadFolder } from '../scratch-pad-folder/scratch-pad-folder'
import { proseCheckFrom } from '../prose-check/prose-check'
import { createScratchPad, type Environment } from '../scratch-pads-home/scratch-pads-home'
import { scratchPadCreatedText } from '../scratch-pads-home/scratch-pads-home-text'
import {
  inboxTypes,
  requiredWord,
  restOfWords,
  taskNumber,
  type CommandOptions,
  type OptionName,
} from './command-words'

export interface CommandInput {
  readonly words: readonly string[]
  readonly options: CommandOptions
  readonly usage: string
  readonly environment: Environment
  readonly home: () => string
  readonly folder: () => ScratchPadFolder
}

export interface ScratchPadCommand {
  readonly usage: string
  readonly summary: string
  readonly options: readonly OptionName[]
  readonly wordsBeforeText?: number
  readonly run: (input: CommandInput) => string | CommandOutput
}

export interface CommandOutput {
  readonly text: string
  readonly exitCode: number
}

const pad: readonly OptionName[] = ['pad']

export const scratchPadCommands: ReadonlyMap<string, ScratchPadCommand> = new Map([
  [
    'new',
    {
      usage: 'new <topic>',
      summary: 'create a scratch pad with an index page and a progress tracker',
      options: [],
      wordsBeforeText: 0,
      run: (input: CommandInput) => {
        const topic = restOfWords(input.words, 0, 'topic', input.usage)
        return scratchPadCreatedText(createScratchPad(input.home(), topic, new Date()))
      },
    },
  ],
  [
    'status',
    {
      usage: 'status',
      summary: 'print the current task and what waits for the agent and for Nick',
      options: pad,
      run: (input: CommandInput) => scratchPadStatus(input.folder()),
    },
  ],
  [
    'inbox',
    {
      usage: 'inbox [--type <types>] [--all]',
      summary:
        'print the new items that wait for the agent (types: comment,decision,grammar,improvement)',
      options: ['pad', 'type', 'all'],
      run: (input: CommandInput) =>
        readAgentInbox(input.folder(), {
          types: inboxTypes(input.options.type),
          includeSeen: input.options.all,
        }),
    },
  ],
  [
    'show',
    {
      usage: 'show <id>',
      summary: 'print one whole thread or decision',
      options: pad,
      run: (input: CommandInput) =>
        showItem(input.folder(), requiredWord(input.words, 0, 'id', input.usage)),
    },
  ],
  [
    'reply',
    {
      usage: 'reply <id> <text>',
      summary: 'add the reply of the agent to a thread, which then waits for Nick',
      options: pad,
      wordsBeforeText: 1,
      run: (input: CommandInput) =>
        replyToThread(
          input.folder(),
          requiredWord(input.words, 0, 'id', input.usage),
          restOfWords(input.words, 1, 'text', input.usage),
        ),
    },
  ],
  [
    'done',
    {
      usage: 'done <id> <outcome>',
      summary: 'close a grammar note or an improvement note with one line about the change',
      options: pad,
      wordsBeforeText: 1,
      run: (input: CommandInput) =>
        finishNoteThread(
          input.folder(),
          requiredWord(input.words, 0, 'id', input.usage),
          restOfWords(input.words, 1, 'outcome', input.usage),
        ),
    },
  ],
  [
    'pages',
    {
      usage: 'pages',
      summary: 'list the pages with their titles and open threads',
      options: pad,
      run: (input: CommandInput) => listPages(input.folder()),
    },
  ],
  [
    'check',
    {
      usage: 'check [page]',
      summary: 'print the broken links, ids and blocks of one page or of every page',
      options: pad,
      run: (input: CommandInput) => {
        const result = checkPages(
          input.folder(),
          input.words[0],
          proseCheckFrom(input.environment['SCRATCH_PAD_PROSE_CHECK']),
        )
        return { text: result.text, exitCode: result.problemCount === 0 ? 0 : 1 }
      },
    },
  ],
  [
    'outline',
    {
      usage: 'outline <page>',
      summary: 'print the headings of a page with their line numbers',
      options: pad,
      run: (input: CommandInput) =>
        outlinePage(input.folder(), requiredWord(input.words, 0, 'page', input.usage)),
    },
  ],
  [
    'goal',
    {
      usage: 'goal <text>',
      summary: 'set the goal of the progress tracker',
      options: pad,
      wordsBeforeText: 0,
      run: (input: CommandInput) =>
        setGoalOfScratchPad(input.folder(), restOfWords(input.words, 0, 'goal', input.usage)),
    },
  ],
  [
    'tasks',
    {
      usage: 'tasks',
      summary: 'list every task with its number, state and title',
      options: pad,
      run: (input: CommandInput) => listTasks(input.folder()),
    },
  ],
  [
    'task add',
    {
      usage: 'task add <title>',
      summary: 'add a task to the progress tracker',
      options: pad,
      wordsBeforeText: 0,
      run: (input: CommandInput) =>
        addTaskToTracker(input.folder(), restOfWords(input.words, 0, 'title', input.usage)),
    },
  ],
  [
    'task start',
    {
      usage: 'task start <number>',
      summary: 'start a task',
      options: pad,
      run: (input: CommandInput) =>
        startTaskInTracker(input.folder(), taskNumber(input.words, 0, input.usage)),
    },
  ],
  [
    'task done',
    {
      usage: 'task done <number>',
      summary: 'finish a task and start the next task that is to do',
      options: pad,
      run: (input: CommandInput) =>
        finishTaskInTracker(input.folder(), taskNumber(input.words, 0, input.usage)),
    },
  ],
  [
    'decide',
    {
      usage: 'decide <text>',
      summary: 'add a decision from the chat to the log of decisions',
      options: pad,
      wordsBeforeText: 0,
      run: (input: CommandInput) =>
        logDecisionFromChat(input.folder(), restOfWords(input.words, 0, 'decision', input.usage)),
    },
  ],
])
