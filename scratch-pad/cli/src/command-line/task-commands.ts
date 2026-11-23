import {
  addSubtaskToTracker,
  addTaskToTracker,
  assignSubtaskInTracker,
  assignTaskInTracker,
  describeSubtaskInTracker,
  describeTaskInTracker,
  finishSubtaskInTracker,
  finishTaskInTracker,
  listTasks,
  moveSubtaskInTracker,
  moveTaskInTracker,
  showSubtask,
  showTask,
  startSubtaskInTracker,
  startTaskInTracker,
} from '../agent-commands/progress-tracker-commands'
import { progressTrackerLink, textWithLink } from '../item-links/item-links'
import { type ScratchPadFolder } from '../scratch-pad-folder/scratch-pad-folder'
import { linksOf, pad, type CommandInput, type ScratchPadCommand } from './command-input'
import {
  assignmentTextOf,
  parentTaskNumber,
  placementOf,
  restOfWords,
  subtaskNumber,
  subtaskNumberFrom,
  taskNumber,
  taskNumberFrom,
} from './command-words'

export async function withTrackerLink(
  input: CommandInput,
  change: (folder: ScratchPadFolder) => string,
): Promise<string> {
  const folder = input.folder()
  const text = change(folder)
  const links = await linksOf(input, folder)
  return textWithLink(links, text, progressTrackerLink(links))
}

const moveOptions = ['pad', 'before', 'after'] as const

const assignOptions = ['pad', 'do', 'why'] as const

export const taskCommands: ReadonlyArray<readonly [string, ScratchPadCommand]> = [
  [
    'tasks',
    {
      usage: 'tasks',
      summary: 'list every task and subtask with its number, id, state and title',
      options: pad,
      run: (input: CommandInput) => withTrackerLink(input, listTasks),
    },
  ],
  [
    'task add',
    {
      usage: 'task add <title>',
      summary: 'add a task to the end of the progress tracker',
      options: pad,
      wordsBeforeText: 0,
      run: (input: CommandInput) =>
        withTrackerLink(input, (folder) =>
          addTaskToTracker(folder, restOfWords(input.words, 0, 'title', input.usage)),
        ),
    },
  ],
  [
    'task describe',
    {
      usage: 'task describe <number>',
      summary:
        'replace the description of a task (the Markdown description comes from standard input)',
      options: pad,
      run: async (input: CommandInput) => {
        const folder = input.folder()
        const number = taskNumber(input.words, 0, input.usage)
        const description = await input.readStandardInput()
        return describeTaskInTracker(folder, number, description, await linksOf(input, folder))
      },
    },
  ],
  [
    'task assign',
    {
      usage: 'task assign <number> --do <text> --why <text>',
      summary:
        "assign a task that has no subtasks to Nick (--do is what he has to do and --why is why the agent can't do it)",
      options: assignOptions,
      run: async (input: CommandInput) => {
        const folder = input.folder()
        const number = taskNumber(input.words, 0, input.usage)
        const text = assignmentTextOf(input.words, input.options, input.usage)
        return assignTaskInTracker(folder, number, text, await linksOf(input, folder))
      },
    },
  ],
  [
    'task show',
    {
      usage: 'task show <number>',
      summary:
        'print a task with its state, its assignment to Nick, its subtasks and its description',
      options: pad,
      run: async (input: CommandInput) => {
        const folder = input.folder()
        const number = taskNumber(input.words, 0, input.usage)
        return showTask(folder, number, await linksOf(input, folder))
      },
    },
  ],
  [
    'task start',
    {
      usage: 'task start <number>',
      summary: 'start a task that has no subtasks',
      options: pad,
      run: (input: CommandInput) =>
        withTrackerLink(input, (folder) =>
          startTaskInTracker(folder, taskNumber(input.words, 0, input.usage)),
        ),
    },
  ],
  [
    'task done',
    {
      usage: 'task done <number>',
      summary: 'finish a task that has no subtasks and start the next task that is to do',
      options: pad,
      run: (input: CommandInput) =>
        withTrackerLink(input, (folder) =>
          finishTaskInTracker(folder, taskNumber(input.words, 0, input.usage)),
        ),
    },
  ],
  [
    'task move',
    {
      usage: 'task move <number> --before|--after <number>',
      summary: 'move a task and its subtasks, then number every task again from the top',
      options: moveOptions,
      run: (input: CommandInput) =>
        withTrackerLink(input, (folder) =>
          moveTaskInTracker(
            folder,
            taskNumber(input.words, 0, input.usage),
            placementOf(input.options, input.usage, (text) => taskNumberFrom(text, input.usage)),
          ),
        ),
    },
  ],
  [
    'subtask add',
    {
      usage: 'subtask add <task number> <title>',
      summary: 'add a subtask to the end of the subtasks of a task',
      options: pad,
      wordsBeforeText: 1,
      run: async (input: CommandInput) => {
        const folder = input.folder()
        const number = parentTaskNumber(input.words, 0, input.usage)
        const title = restOfWords(input.words, 1, 'title', input.usage)
        return addSubtaskToTracker(folder, number, title, await linksOf(input, folder))
      },
    },
  ],
  [
    'subtask describe',
    {
      usage: 'subtask describe <number>',
      summary:
        'replace the description of a subtask (the Markdown description comes from standard input)',
      options: pad,
      run: async (input: CommandInput) => {
        const folder = input.folder()
        const number = subtaskNumber(input.words, 0, input.usage)
        const description = await input.readStandardInput()
        return describeSubtaskInTracker(folder, number, description, await linksOf(input, folder))
      },
    },
  ],
  [
    'subtask assign',
    {
      usage: 'subtask assign <number> --do <text> --why <text>',
      summary:
        "assign a subtask to Nick (--do is what he has to do and --why is why the agent can't do it)",
      options: assignOptions,
      run: async (input: CommandInput) => {
        const folder = input.folder()
        const number = subtaskNumber(input.words, 0, input.usage)
        const text = assignmentTextOf(input.words, input.options, input.usage)
        return assignSubtaskInTracker(folder, number, text, await linksOf(input, folder))
      },
    },
  ],
  [
    'subtask show',
    {
      usage: 'subtask show <number>',
      summary: 'print a subtask with its state, its assignment to Nick and its description',
      options: pad,
      run: async (input: CommandInput) => {
        const folder = input.folder()
        const number = subtaskNumber(input.words, 0, input.usage)
        return showSubtask(folder, number, await linksOf(input, folder))
      },
    },
  ],
  [
    'subtask start',
    {
      usage: 'subtask start <number>',
      summary: 'start a subtask',
      options: pad,
      run: (input: CommandInput) =>
        withTrackerLink(input, (folder) =>
          startSubtaskInTracker(folder, subtaskNumber(input.words, 0, input.usage)),
        ),
    },
  ],
  [
    'subtask done',
    {
      usage: 'subtask done <number>',
      summary:
        'finish a subtask and start the next subtask of its task that is to do, or else the next task',
      options: pad,
      run: (input: CommandInput) =>
        withTrackerLink(input, (folder) =>
          finishSubtaskInTracker(folder, subtaskNumber(input.words, 0, input.usage)),
        ),
    },
  ],
  [
    'subtask move',
    {
      usage: 'subtask move <number> --before|--after <number>',
      summary: 'move a subtask among the subtasks of its task, then number them again',
      options: moveOptions,
      run: (input: CommandInput) =>
        withTrackerLink(input, (folder) =>
          moveSubtaskInTracker(
            folder,
            subtaskNumber(input.words, 0, input.usage),
            placementOf(input.options, input.usage, (text) => subtaskNumberFrom(text, input.usage)),
          ),
        ),
    },
  ],
]
