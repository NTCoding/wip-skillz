import { parseArgs } from 'node:util'
import { mainAgentTypes } from '../agent-inbox/agent-inbox'
import { itemTypes, type ItemType } from '../items/item-id'
import { type SubtaskNumber } from '../progress-tracker/progress-tracker'
import { type Placement } from '../progress-tracker/task-moves'
import { ScratchPadError } from '../scratch-pad-error'

export const optionNames = [
  'pad',
  'type',
  'all',
  'port',
  'quiet',
  'timeout',
  'out',
  'before',
  'after',
] as const
export type OptionName = (typeof optionNames)[number]

const knownOptions: readonly string[] = [...optionNames, 'help']

const parserOptions = {
  pad: { type: 'string' },
  type: { type: 'string' },
  all: { type: 'boolean' },
  port: { type: 'string' },
  quiet: { type: 'string' },
  timeout: { type: 'string' },
  out: { type: 'string' },
  before: { type: 'string' },
  after: { type: 'string' },
  help: { type: 'boolean' },
} as const

const subtaskPattern = /^([1-9]\d*)\.([1-9]\d*)$/

type StartsText = (wordsBefore: readonly string[]) => boolean

export interface CommandOptions {
  readonly pad: string | undefined
  readonly type: string | undefined
  readonly all: boolean
  readonly port: string | undefined
  readonly quiet: string | undefined
  readonly timeout: string | undefined
  readonly out: string | undefined
  readonly before: string | undefined
  readonly after: string | undefined
}

export interface CommandWords {
  readonly words: readonly string[]
  readonly options: CommandOptions
  readonly givenOptions: readonly OptionName[]
  readonly help: boolean
}

type OptionValues = Readonly<Record<string, string | boolean | undefined>>

export class UnknownOptionError extends ScratchPadError {
  constructor(name: string) {
    super(`--${name} isn't an option. Run "scratch-pad help" to list the commands and options.`)
  }
}

export class OptionValueError extends ScratchPadError {
  constructor(name: string, expected: string) {
    super(`--${name} ${expected}.`)
  }
}

export class MissingArgumentError extends ScratchPadError {
  constructor(name: string, usage: string) {
    super(`The ${name} is missing. Usage: scratch-pad ${usage}`)
  }
}

export class InvalidTaskNumberError extends ScratchPadError {
  constructor(text: string, usage: string) {
    super(
      subtaskPattern.test(text)
        ? `"${text}" is the number of a subtask. Run the subtask command for a subtask, like "scratch-pad subtask show ${text}". Usage: scratch-pad ${usage}`
        : `"${text}" isn't a task number. Usage: scratch-pad ${usage}`,
    )
  }
}

export class InvalidSubtaskNumberError extends ScratchPadError {
  constructor(text: string, usage: string) {
    super(
      `"${text}" isn't a subtask number. A subtask number starts with the number of its task, like 2.1. Usage: scratch-pad ${usage}`,
    )
  }
}

export class SubtaskOfSubtaskError extends ScratchPadError {
  constructor(text: string) {
    super(
      `"${text}" is the number of a subtask, but a subtask can't have subtasks. Add the subtask to task ${text.split('.')[0]} instead.`,
    )
  }
}

export class PlacementError extends ScratchPadError {
  constructor(usage: string) {
    super(`Pass either --before <number> or --after <number>. Usage: scratch-pad ${usage}`)
  }
}

export class InvalidImprovementNumberError extends ScratchPadError {
  constructor(text: string, usage: string) {
    super(`"${text}" isn't an improvement number. Usage: scratch-pad ${usage}`)
  }
}

export class UnknownItemTypeError extends ScratchPadError {
  constructor(type: string) {
    super(`"${type}" isn't a type. The types are: ${itemTypes.join(', ')}`)
  }
}

export class InvalidPortError extends ScratchPadError {
  constructor(text: string) {
    super(`"${text}" isn't a port. A port is a whole number from 0 to 65535.`)
  }
}

export class InvalidSecondsError extends ScratchPadError {
  constructor(name: string, text: string) {
    super(`--${name} needs a number of seconds, like 10. "${text}" isn't a number of seconds.`)
  }
}

export function parseCommandWords(argv: readonly string[], startsText: StartsText): CommandWords {
  const textIndex = indexOfText(argv, startsText)
  const { values, positionals } = parseArgs({
    args: argv.slice(0, textIndex),
    strict: false,
    allowPositionals: true,
    options: parserOptions,
  })
  const unknown = Object.keys(values).find((name) => !knownOptions.includes(name))
  if (unknown !== undefined) {
    throw new UnknownOptionError(unknown)
  }
  return {
    words: [...positionals, ...argv.slice(textIndex)],
    options: {
      pad: textOption(values, 'pad'),
      type: textOption(values, 'type'),
      all: flagOption(values, 'all'),
      port: textOption(values, 'port'),
      quiet: textOption(values, 'quiet'),
      timeout: textOption(values, 'timeout'),
      out: textOption(values, 'out'),
      before: textOption(values, 'before'),
      after: textOption(values, 'after'),
    },
    givenOptions: optionNames.filter((name) => values[name] !== undefined),
    help: flagOption(values, 'help'),
  }
}

export function requiredWord(
  words: readonly string[],
  index: number,
  name: string,
  usage: string,
): string {
  const word = words[index]
  if (word === undefined || word.trim() === '') {
    throw new MissingArgumentError(name, usage)
  }
  return word
}

export function restOfWords(
  words: readonly string[],
  index: number,
  name: string,
  usage: string,
): string {
  const text = words.slice(index).join(' ').trim()
  if (text === '') {
    throw new MissingArgumentError(name, usage)
  }
  return text
}

function positiveNumber(text: string, invalid: () => ScratchPadError): number {
  if (!/^[1-9]\d*$/.test(text)) {
    throw invalid()
  }
  return Number(text)
}

export function taskNumber(words: readonly string[], index: number, usage: string): number {
  return taskNumberFrom(requiredWord(words, index, 'task number', usage), usage)
}

export function subtaskNumber(
  words: readonly string[],
  index: number,
  usage: string,
): SubtaskNumber {
  return subtaskNumberFrom(requiredWord(words, index, 'subtask number', usage), usage)
}

// The task that a new subtask is added to. It can't be a subtask, because a subtask can't have
// subtasks.
export function parentTaskNumber(words: readonly string[], index: number, usage: string): number {
  const text = requiredWord(words, index, 'task number', usage)
  if (subtaskPattern.test(text)) {
    throw new SubtaskOfSubtaskError(text)
  }
  return taskNumber(words, index, usage)
}

// Where a moved task or subtask goes. Exactly one of --before and --after is given.
export function placementOf<N>(
  options: CommandOptions,
  usage: string,
  parse: (text: string) => N,
): Placement<N> {
  const { before, after } = options
  if (before !== undefined && after === undefined) {
    return { side: 'before', target: parse(before) }
  }
  if (after !== undefined && before === undefined) {
    return { side: 'after', target: parse(after) }
  }
  throw new PlacementError(usage)
}

export function taskNumberFrom(text: string, usage: string): number {
  return positiveNumber(text, () => new InvalidTaskNumberError(text, usage))
}

export function subtaskNumberFrom(text: string, usage: string): SubtaskNumber {
  const match = subtaskPattern.exec(text)
  if (match === null) {
    throw new InvalidSubtaskNumberError(text, usage)
  }
  return { task: Number(match[1]), subtask: Number(match[2]) }
}

export function improvementNumber(words: readonly string[], index: number, usage: string): number {
  const text = requiredWord(words, index, 'improvement number', usage)
  return positiveNumber(text, () => new InvalidImprovementNumberError(text, usage))
}

export function inboxTypes(typeOption: string | undefined): readonly ItemType[] {
  if (typeOption === undefined) {
    return mainAgentTypes
  }
  return typeOption.split(',').map((name) => {
    const type = itemTypes.find((candidate) => candidate === name.trim())
    if (type === undefined) {
      throw new UnknownItemTypeError(name)
    }
    return type
  })
}

export function portNumber(text: string | undefined, defaultPort: number): number {
  if (text === undefined) {
    return defaultPort
  }
  if (!/^\d{1,5}$/.test(text) || Number(text) > 65_535) {
    throw new InvalidPortError(text)
  }
  return Number(text)
}

export function milliseconds(name: string, text: string | undefined): number | undefined {
  if (text === undefined) {
    return undefined
  }
  if (!/^\d+(\.\d+)?$/.test(text)) {
    throw new InvalidSecondsError(name, text)
  }
  return Number(text) * 1000
}

function indexOfText(argv: readonly string[], startsText: StartsText): number {
  const { tokens } = parseArgs({
    args: [...argv],
    strict: false,
    allowPositionals: true,
    tokens: true,
    options: parserOptions,
  })
  const wordsBefore = (end: number): string[] =>
    tokens.slice(0, end).flatMap((token) => (token.kind === 'positional' ? [token.value] : []))
  const isOption = (token: (typeof tokens)[number], position: number): boolean =>
    token.kind === 'option' &&
    knownOptions.includes(token.name) &&
    (token.name !== 'help' || position === tokens.length - 1)
  const first = tokens.find(
    (token, position) => !isOption(token, position) && startsText(wordsBefore(position)),
  )
  if (first === undefined) {
    return argv.length
  }
  return first.kind === 'option-terminator' ? first.index + 1 : first.index
}

function textOption(values: OptionValues, name: string): string | undefined {
  const value = values[name]
  if (typeof value === 'boolean') {
    throw new OptionValueError(name, 'needs a value')
  }
  return value
}

function flagOption(values: OptionValues, name: string): boolean {
  const value = values[name]
  if (typeof value === 'string') {
    throw new OptionValueError(name, "doesn't take a value")
  }
  return value === true
}
