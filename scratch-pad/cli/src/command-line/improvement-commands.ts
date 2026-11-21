import {
  deleteImprovementFromChat,
  editImprovementFromChat,
  logImprovementFromChat,
} from '../agent-commands/improvement-commands'
import { linksOf, pad, type CommandInput, type ScratchPadCommand } from './command-input'
import { improvementNumber, restOfWords } from './command-words'

export const improvementCommands: ReadonlyArray<readonly [string, ScratchPadCommand]> = [
  [
    'improve',
    {
      usage: 'improve <title>',
      summary:
        'log an improvement to the harness, the skill, the tool or the UX (the Markdown details come from standard input)',
      options: pad,
      wordsBeforeText: 0,
      run: async (input: CommandInput) => {
        const folder = input.folder()
        const title = restOfWords(input.words, 0, 'title', input.usage)
        const details = await input.readStandardInput()
        return logImprovementFromChat(folder, title, details, await linksOf(input, folder))
      },
    },
  ],
  [
    'improvement edit',
    {
      usage: 'improvement edit <number> <title>',
      summary:
        'replace the title and the details of an improvement (the Markdown details come from standard input)',
      options: pad,
      wordsBeforeText: 1,
      run: async (input: CommandInput) => {
        const folder = input.folder()
        const number = improvementNumber(input.words, 0, input.usage)
        const title = restOfWords(input.words, 1, 'title', input.usage)
        const details = await input.readStandardInput()
        return editImprovementFromChat(folder, number, title, details, await linksOf(input, folder))
      },
    },
  ],
  [
    'improvement delete',
    {
      usage: 'improvement delete <number>',
      summary: 'delete an improvement',
      options: pad,
      run: async (input: CommandInput) => {
        const folder = input.folder()
        const number = improvementNumber(input.words, 0, input.usage)
        return deleteImprovementFromChat(folder, number, await linksOf(input, folder))
      },
    },
  ],
]
