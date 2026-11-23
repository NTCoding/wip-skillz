import { ScratchPadError } from '../scratch-pad-error'
import { type ToolCommand } from '../server-process/server-process'
import {
  chooseScratchPad,
  scratchPadsHome,
  type Environment,
} from '../scratch-pads-home/scratch-pads-home'
import { parseCommandWords, type CommandWords } from './command-words'
import { type CommandOutput, type ScratchPadCommand } from './command-input'
import { scratchPadCommands } from './scratch-pad-commands'

interface OutputStream {
  write(text: string): unknown
}

interface CommandLine {
  readonly argv: readonly string[]
  readonly environment: Environment
  readonly stdout: OutputStream
  readonly stderr: OutputStream
  readonly readStandardInput: () => Promise<string>
  readonly toolCommand: ToolCommand
  readonly stopSignal: AbortSignal
}

class UnknownCommandError extends ScratchPadError {
  constructor(words: readonly string[]) {
    super(`"${words.join(' ')}" isn't a command. Run "scratch-pad help" to list the commands.`)
  }
}

class OptionNotAllowedError extends ScratchPadError {
  constructor(option: string, usage: string) {
    super(`--${option} doesn't work with this command. Usage: scratch-pad ${usage}`)
  }
}

export async function runCommandLine(commandLine: CommandLine): Promise<number> {
  try {
    const output = await runCommand(commandLine)
    commandLine.stdout.write(`${output.text}\n`)
    return output.exitCode
  } catch (error) {
    if (error instanceof ScratchPadError || isSystemError(error)) {
      commandLine.stderr.write(`${error.message}\n`)
      return 1
    }
    throw error
  }
}

export function helpText(): string {
  const commands = [...scratchPadCommands.values()]
  const width = Math.max(...commands.map((command) => command.usage.length))
  return [
    'usage: scratch-pad <command> [--pad <folder>]',
    '',
    ...commands.map((command) => `  ${command.usage.padEnd(width)}  ${command.summary}`),
    '',
    'The scratch pad comes from --pad <folder name or path>, else from SCRATCH_PAD.',
    'The scratch pads are in SCRATCH_PADS_HOME, else in ~/scratchpads.',
    'An option after the text of new, goal, task add, subtask add, decide, improve, improvement edit, reply or done is part of the text.',
  ].join('\n')
}

async function runCommand(commandLine: CommandLine): Promise<CommandOutput> {
  const parsed = parseCommandWords(commandLine.argv, startsText)
  if (parsed.help || parsed.words.length === 0 || parsed.words[0] === 'help') {
    return { text: helpText(), exitCode: 0 }
  }
  const { command, words } = findCommand(parsed)
  const notAllowed = parsed.givenOptions.find((option) => !command.options.includes(option))
  if (notAllowed !== undefined) {
    throw new OptionNotAllowedError(notAllowed, command.usage)
  }
  const home = (): string => scratchPadsHome(commandLine.environment)
  const selector = parsed.options.pad ?? commandLine.environment['SCRATCH_PAD']
  const output = await command.run({
    words,
    options: parsed.options,
    usage: command.usage,
    environment: commandLine.environment,
    home,
    folder: () => chooseScratchPad(home(), selector),
    selectedFolder: () =>
      selector === undefined || selector === '' ? undefined : chooseScratchPad(home(), selector),
    readStandardInput: commandLine.readStandardInput,
    toolCommand: commandLine.toolCommand,
    stopSignal: commandLine.stopSignal,
    log: (text) => commandLine.stderr.write(`${text}\n`),
  })
  return typeof output === 'string' ? { text: output, exitCode: 0 } : output
}

interface FoundCommand {
  readonly command: ScratchPadCommand
  readonly words: readonly string[]
}

function findCommand(parsed: CommandWords): FoundCommand {
  const found = matchCommand(parsed.words)
  if (found === undefined) {
    throw new UnknownCommandError(parsed.words.slice(0, 2))
  }
  return found
}

function startsText(wordsBefore: readonly string[]): boolean {
  const found = matchCommand(wordsBefore)
  return found !== undefined && found.command.wordsBeforeText === found.words.length
}

function matchCommand(words: readonly string[]): FoundCommand | undefined {
  const [first, second, ...rest] = words
  if (first === undefined) {
    return undefined
  }
  const twoWordCommand =
    second === undefined ? undefined : scratchPadCommands.get(`${first} ${second}`)
  if (twoWordCommand !== undefined) {
    return { command: twoWordCommand, words: rest }
  }
  const oneWordCommand = scratchPadCommands.get(first)
  return oneWordCommand === undefined
    ? undefined
    : { command: oneWordCommand, words: words.slice(1) }
}

function isSystemError(error: unknown): error is Error {
  return error instanceof Error && 'syscall' in error
}
