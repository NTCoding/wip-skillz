import { type Answer } from '../decisions/decision-answer'
import { ScratchPadError } from '../scratch-pad-error'
import { threadTypes, type Anchor, type ThreadType } from '../threads/thread'

export class InvalidRequestBodyError extends ScratchPadError {
  constructor(problem: string) {
    super(`The body of the request is invalid: ${problem}.`)
  }
}

type JsonObject = Readonly<Record<string, unknown>>

interface CommentRequest {
  readonly type: ThreadType
  readonly page: string
  readonly anchor: Anchor | undefined
  readonly text: string
}

export interface AnswerRequest {
  readonly page: string
  readonly answer: Answer
}

const choices: readonly string[] = ['proposal', 'alternative']

export const longestMessage = 10_000

function withinMessageLimit(name: string, text: string): string {
  if (text.length > longestMessage) {
    throw new InvalidRequestBodyError(
      `"${name}" has ${text.length} characters, but a message can't be longer than ${longestMessage} characters`,
    )
  }
  return text
}

export function jsonObjectFrom(value: unknown): JsonObject | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value))
    : undefined
}

export class RequestBody {
  private constructor(private readonly values: JsonObject) {}

  static parse(text: string): RequestBody {
    const values = jsonObjectFrom(parsedJson(text))
    if (values === undefined) {
      throw new InvalidRequestBodyError('it must be a JSON object')
    }
    return new RequestBody(values)
  }

  text(name: string): string {
    const value = this.optionalText(name)
    if (value === undefined) {
      throw new InvalidRequestBodyError(`"${name}" is missing`)
    }
    return value
  }

  messageText(name: string): string {
    return withinMessageLimit(name, this.text(name))
  }

  optionalText(name: string): string | undefined {
    const value = this.optional(name)
    if (value === undefined || typeof value === 'string') {
      return value
    }
    throw new InvalidRequestBodyError(`"${name}" must be a text`)
  }

  optionalWholeNumber(name: string): number | undefined {
    const value = this.optional(name)
    if (value === undefined || (typeof value === 'number' && Number.isInteger(value))) {
      return value
    }
    throw new InvalidRequestBodyError(`"${name}" must be a whole number`)
  }

  private optional(name: string): unknown {
    const value = this.values[name]
    return value === null ? undefined : value
  }
}

export function commentRequestFrom(body: RequestBody): CommentRequest {
  const typeName = body.text('type')
  const type = threadTypes.find((candidate) => candidate === typeName)
  if (type === undefined) {
    throw new InvalidRequestBodyError(`"type" must be one of ${threadTypes.join(', ')}`)
  }
  return {
    type,
    page: body.text('page'),
    anchor: anchorFrom(body),
    text: body.messageText('message'),
  }
}

export function answerRequestFrom(body: RequestBody): AnswerRequest {
  const choice = body.optionalText('choice')
  const written = body.optionalText('written')
  if (choice !== undefined && written === undefined && choices.includes(choice)) {
    return { page: body.text('page'), answer: { choice } }
  }
  if (choice === undefined && written !== undefined) {
    return { page: body.text('page'), answer: { written: withinMessageLimit('written', written) } }
  }
  throw new InvalidRequestBodyError(
    'it needs either "choice" with proposal or alternative, or "written" with the answer',
  )
}

function anchorFrom(body: RequestBody): Anchor | undefined {
  const firstLine = body.optionalWholeNumber('firstLine')
  const lastLine = body.optionalWholeNumber('lastLine')
  const selectedText = body.optionalText('selectedText')
  const prefix = body.optionalText('prefix')
  const suffix = body.optionalText('suffix')
  const lines = firstLine !== undefined && lastLine !== undefined
  const texts = selectedText !== undefined && prefix !== undefined && suffix !== undefined
  if (lines && texts) {
    return { firstLine, lastLine, selectedText, prefix, suffix }
  }
  if ([firstLine, lastLine, selectedText, prefix, suffix].every((value) => value === undefined)) {
    return undefined
  }
  throw new InvalidRequestBodyError(
    '"firstLine", "lastLine", "selectedText", "prefix" and "suffix" must be given together',
  )
}

function parsedJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    throw new InvalidRequestBodyError("it isn't JSON")
  }
}
