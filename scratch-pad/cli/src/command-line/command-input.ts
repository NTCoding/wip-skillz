import { itemLinks, type ItemLinks } from '../item-links/item-links'
import { type ScratchPadFolder } from '../scratch-pad-folder/scratch-pad-folder'
import { type Environment } from '../scratch-pads-home/scratch-pads-home'
import { runningServer, type ToolCommand } from '../server-process/server-process'
import { type CommandOptions, type OptionName } from './command-words'

export interface CommandInput {
  readonly words: readonly string[]
  readonly options: CommandOptions
  readonly usage: string
  readonly environment: Environment
  readonly home: () => string
  readonly folder: () => ScratchPadFolder
  readonly selectedFolder: () => ScratchPadFolder | undefined
  readonly readStandardInput: () => Promise<string>
  readonly toolCommand: ToolCommand
  readonly stopSignal: AbortSignal
  readonly log: (text: string) => void
}

export interface ScratchPadCommand {
  readonly usage: string
  readonly summary: string
  readonly options: readonly OptionName[]
  readonly wordsBeforeText?: number
  readonly run: (input: CommandInput) => CommandResult | Promise<CommandResult>
}

type CommandResult = string | CommandOutput

export interface CommandOutput {
  readonly text: string
  readonly exitCode: number
}

export const pad: readonly OptionName[] = ['pad']

export async function linksOf(input: CommandInput, folder: ScratchPadFolder): Promise<ItemLinks> {
  const running = await runningServer(input.home())
  return itemLinks(folder.name, running?.port)
}
