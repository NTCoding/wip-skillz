import { checkPages } from '../agent-commands/check-commands'
import { readAgentInbox, scratchPadStatus } from '../agent-commands/inbox-commands'
import { logDecisionFromChat } from '../agent-commands/decision-log-commands'
import { exportScratchPad } from '../agent-commands/export-commands'
import { listPages, outlinePage } from '../agent-commands/page-commands'
import { setGoalOfScratchPad } from '../agent-commands/progress-tracker-commands'
import { createPage, makeDecisionPageReady } from '../agent-commands/decision-page-commands'
import { finishItem, reopenItem, replyToThread, showItem } from '../agent-commands/thread-commands'
import { followAgentInbox, waitForAgentInbox } from '../agent-commands/wait-commands'
import { browserPageBundle } from '../local-server/browser-page-bundle'
import { toolBuild } from '../local-server/tool-build'
import { padLink, textWithLink } from '../item-links/item-links'
import { proseCheckFrom } from '../prose-check/prose-check'
import { createScratchPad } from '../scratch-pads-home/scratch-pads-home'
import { scratchPadCreatedText } from '../scratch-pads-home/scratch-pads-home-text'
import {
  serveInThisProcess,
  startServerProcess,
  stopServerProcess,
} from '../server-process/server-process'
import { servingText, startedServerText, stoppedServerText } from '../server-process/server-text'
import { linksOf, pad, type CommandInput, type ScratchPadCommand } from './command-input'
import {
  FollowWithTimeoutError,
  inboxTypes,
  milliseconds,
  portNumber,
  requiredWord,
  restOfWords,
} from './command-words'
import { improvementCommands } from './improvement-commands'
import { taskCommands, withTrackerLink } from './task-commands'

const defaultPort = 4747
const checkMilliseconds = 250
const startMilliseconds = 5000
const stopMilliseconds = 5000
const defaultQuietMilliseconds = 120_000

// An agent that ends its turn while `wait` isn't running misses Nick's next comment. That's why
// the output of the commands that the agent runs while it deals with Nick's items ends with this
// line.
const waitReminder = 'Check that `wait` is still running before you end your turn.'

function withWaitReminder(text: string): string {
  return `${text}\n${waitReminder}`
}

export const scratchPadCommands: ReadonlyMap<string, ScratchPadCommand> = new Map([
  [
    'new',
    {
      usage: 'new <topic>',
      summary: 'create a scratch pad with an index page and a progress tracker',
      options: [],
      wordsBeforeText: 0,
      run: async (input: CommandInput) => {
        const topic = restOfWords(input.words, 0, 'topic', input.usage)
        const folder = createScratchPad(input.home(), topic, new Date())
        const links = await linksOf(input, folder)
        return textWithLink(links, scratchPadCreatedText(folder), padLink(links))
      },
    },
  ],
  [
    'start',
    {
      usage: 'start [--port <port>]',
      summary: 'start the server of every scratch pad in the background and print the address',
      options: ['pad', 'port'],
      run: async (input: CommandInput) => {
        const padName = input.selectedFolder()?.name
        const started = await startServerProcess({
          home: input.home(),
          port: portNumber(input.options.port, defaultPort),
          build: toolBuild,
          toolCommand: input.toolCommand,
          environment: input.environment,
          startMilliseconds,
          stopMilliseconds,
        })
        return startedServerText(started, padName)
      },
    },
  ],
  [
    'stop',
    {
      usage: 'stop',
      summary: 'stop the server',
      options: [],
      run: async (input: CommandInput) =>
        stoppedServerText(await stopServerProcess(input.home(), stopMilliseconds)),
    },
  ],
  [
    'serve',
    {
      usage: 'serve [--port <port>]',
      summary: 'run the server in the foreground (start runs this command in the background)',
      options: ['port'],
      run: async (input: CommandInput) => {
        const home = input.home()
        const port = await serveInThisProcess({
          home,
          port: portNumber(input.options.port, defaultPort),
          checkMilliseconds,
          otherServerMilliseconds: startMilliseconds,
          stopSignal: input.stopSignal,
          log: input.log,
        })
        return servingText(home, port)
      },
    },
  ],
  [
    'status',
    {
      usage: 'status',
      summary: 'print the current task and what waits for the agent and for Nick',
      options: pad,
      run: async (input: CommandInput) => {
        const folder = input.folder()
        return scratchPadStatus(folder, await linksOf(input, folder))
      },
    },
  ],
  [
    'inbox',
    {
      usage: 'inbox [--type <types>] [--all]',
      summary:
        'print the new items that wait for the agent (types: comment,decision,grammar,improvement)',
      options: ['pad', 'type', 'all'],
      run: async (input: CommandInput) => {
        const folder = input.folder()
        const request = { types: inboxTypes(input.options.type), includeSeen: input.options.all }
        return withWaitReminder(readAgentInbox(folder, request, await linksOf(input, folder)))
      },
    },
  ],
  [
    'wait',
    {
      usage: 'wait [--follow] [--quiet <seconds>] [--timeout <seconds>]',
      summary:
        'print the new items like inbox once Nick has been quiet for 2 minutes (--follow keeps printing each batch, --type works as for inbox)',
      options: ['pad', 'type', 'quiet', 'timeout', 'follow'],
      run: async (input: CommandInput) => {
        if (input.options.follow && input.options.timeout !== undefined) {
          throw new FollowWithTimeoutError(input.usage)
        }
        const folder = input.folder()
        const request = {
          types: inboxTypes(input.options.type),
          quietMilliseconds: milliseconds('quiet', input.options.quiet) ?? defaultQuietMilliseconds,
          timeoutMilliseconds: milliseconds('timeout', input.options.timeout),
          checkMilliseconds,
          stopSignal: input.stopSignal,
          links: () => linksOf(input, folder),
        }
        if (input.options.follow) {
          await followAgentInbox(folder, request, input.emit)
          return { text: '', exitCode: 0 }
        }
        return waitForAgentInbox(folder, request)
      },
    },
  ],
  [
    'show',
    {
      usage: 'show <id>',
      summary: 'print one whole thread or decision',
      options: pad,
      run: async (input: CommandInput) => {
        const folder = input.folder()
        const id = requiredWord(input.words, 0, 'id', input.usage)
        return withWaitReminder(showItem(folder, id, await linksOf(input, folder)))
      },
    },
  ],
  [
    'reply',
    {
      usage: 'reply <id> <text>',
      summary: 'add the reply of the agent to a thread, which then waits for Nick',
      options: pad,
      wordsBeforeText: 1,
      run: async (input: CommandInput) => {
        const folder = input.folder()
        const id = requiredWord(input.words, 0, 'id', input.usage)
        const text = restOfWords(input.words, 1, 'text', input.usage)
        return withWaitReminder(replyToThread(folder, id, text, await linksOf(input, folder)))
      },
    },
  ],
  [
    'done',
    {
      usage: 'done <id> <outcome>',
      summary:
        'close a grammar note, an improvement note or a decision with one line about the change',
      options: pad,
      wordsBeforeText: 1,
      run: async (input: CommandInput) => {
        const folder = input.folder()
        const id = requiredWord(input.words, 0, 'id', input.usage)
        const outcome = restOfWords(input.words, 1, 'outcome', input.usage)
        return withWaitReminder(finishItem(folder, id, outcome, await linksOf(input, folder)))
      },
    },
  ],
  [
    'reopen',
    {
      usage: 'reopen <id> <outcome>',
      summary:
        'open a decision with changes requested again with one line about the change, so that it waits for Nick',
      options: pad,
      wordsBeforeText: 1,
      run: async (input: CommandInput) => {
        const folder = input.folder()
        const id = requiredWord(input.words, 0, 'id', input.usage)
        const outcome = restOfWords(input.words, 1, 'outcome', input.usage)
        return withWaitReminder(reopenItem(folder, id, outcome, await linksOf(input, folder)))
      },
    },
  ],
  [
    'ready',
    {
      usage: 'ready <id>',
      summary:
        'make a draft decision page ready after the server has checked the template. Nick can then decide the decision',
      options: pad,
      run: async (input: CommandInput) => {
        const folder = input.folder()
        const id = requiredWord(input.words, 0, 'id', input.usage)
        return withWaitReminder(makeDecisionPageReady(folder, id, await linksOf(input, folder)))
      },
    },
  ],
  [
    'page',
    {
      usage: 'page <parent> <file-name> [--type=decision]',
      summary:
        'create a blank sub page of a page, or a sub page from the template of a type, and print its path and link',
      options: ['pad', 'type'],
      run: async (input: CommandInput) => {
        const folder = input.folder()
        const request = { words: input.words, type: input.options.type, usage: input.usage }
        return withWaitReminder(createPage(folder, request, await linksOf(input, folder)))
      },
    },
  ],
  [
    'pages',
    {
      usage: 'pages',
      summary: 'list the pages with their titles and open threads',
      options: pad,
      run: async (input: CommandInput) => {
        const folder = input.folder()
        return listPages(folder, await linksOf(input, folder))
      },
    },
  ],
  [
    'check',
    {
      usage: 'check [page...]',
      summary: 'print the broken links, ids and blocks of the given pages or of every page',
      options: pad,
      run: (input: CommandInput) => {
        const result = checkPages(
          input.folder(),
          input.words,
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
      run: async (input: CommandInput) => {
        const folder = input.folder()
        const page = requiredWord(input.words, 0, 'page', input.usage)
        return outlinePage(folder, page, await linksOf(input, folder))
      },
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
        withTrackerLink(input, (folder) =>
          setGoalOfScratchPad(folder, restOfWords(input.words, 0, 'goal', input.usage)),
        ),
    },
  ],
  ...taskCommands,
  [
    'decide',
    {
      usage: 'decide <text>',
      summary: 'add a decision from the chat to the log of decisions',
      options: pad,
      wordsBeforeText: 0,
      run: async (input: CommandInput) => {
        const folder = input.folder()
        const decision = restOfWords(input.words, 0, 'decision', input.usage)
        return logDecisionFromChat(folder, decision, await linksOf(input, folder))
      },
    },
  ],
  ...improvementCommands,
  [
    'export',
    {
      usage: 'export [--out <file>]',
      summary:
        'write one HTML file of the scratch pad that opens without the server (default: export.html in the scratch pad)',
      options: ['pad', 'out'],
      run: (input: CommandInput) =>
        exportScratchPad(input.folder(), { out: input.options.out, bundle: browserPageBundle }),
    },
  ],
])
