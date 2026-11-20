import { ScratchPadError } from '../scratch-pad-error'
import {
  chooseScratchPad,
  scratchPadsHome,
  type Environment,
} from '../scratch-pads-home/scratch-pads-home'
import { parseCommandWords, type CommandWords } from './command-words'
import { scratchPadCommands, type ScratchPadCommand } from './scratch-pad-commands'

interface OutputStream {
  write(text: string): unknown
}

interface CommandLine {
  readonly argv: readonly string[]
  readonly environment: Environment
  readonly stdout: OutputStream
  readonly stderr: OutputStream
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

export function runCommandLine(commandLine: CommandLine): number {
  try {
    commandLine.stdout.write(`${runCommand(commandLine)}\n`)
    return 0
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
    'The scratch pads are in SCRATCH_PADS_HOME, else in ~/scratch-pads.',
    'An option after the text of new, goal, task add, decide, reply or done is part of the text.',
  ].join('\n')
}

function runCommand(commandLine: CommandLine): string {
  const parsed = parseCommandWords(commandLine.argv, startsText)
  if (parsed.help || parsed.words.length === 0 || parsed.words[0] === 'help') {
    return helpText()
  }
  const { command, words } = findCommand(parsed)
  const notAllowed = parsed.givenOptions.find((option) => !command.options.includes(option))
  if (notAllowed !== undefined) {
    throw new OptionNotAllowedError(notAllowed, command.usage)
  }
  const home = (): string => scratchPadsHome(commandLine.environment)
  return command.run({
    words,
    options: parsed.options,
    usage: command.usage,
    home,
    folder: () =>
      chooseScratchPad(home(), parsed.options.pad ?? commandLine.environment['SCRATCH_PAD']),
  })
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
  const [first, second] = words
  const twoWordCommand = scratchPadCommands.get(`${first} ${second}`)
  if (twoWordCommand !== undefined) {
    return { command: twoWordCommand, words: words.slice(2) }
  }
  const oneWordCommand = scratchPadCommands.get(String(first))
  return oneWordCommand === undefined
    ? undefined
    : { command: oneWordCommand, words: words.slice(1) }
}

function isSystemError(error: unknown): error is Error {
  return error instanceof Error && 'syscall' in error
}
