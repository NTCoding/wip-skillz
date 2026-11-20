import { ScratchPadError } from '../scratch-pad-error'

export class BrokenFileError extends ScratchPadError {
  constructor(file: string, problem: string) {
    super(`${file} is broken: ${problem}. Fix the file by hand or delete it.`)
  }
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseJson(text: string, file: string): unknown {
  try {
    const parsed: unknown = JSON.parse(text)
    return parsed
  } catch {
    throw new BrokenFileError(file, "it isn't valid JSON")
  }
}

export class JsonFields {
  private constructor(
    private readonly fields: Readonly<Record<string, unknown>>,
    private readonly file: string,
  ) {}

  static from(value: unknown, file: string): JsonFields {
    if (isRecord(value)) {
      return new JsonFields(value, file)
    }
    throw new BrokenFileError(file, 'it must contain a JSON object')
  }

  static parse(text: string, file: string): JsonFields {
    return JsonFields.from(parseJson(text, file), file)
  }

  has(name: string): boolean {
    return this.fields[name] !== undefined
  }

  text(name: string): string {
    const value = this.fields[name]
    if (typeof value === 'string') {
      return value
    }
    throw this.problem(name, 'a text')
  }

  optionalText(name: string): string | undefined {
    return this.has(name) ? this.text(name) : undefined
  }

  wholeNumber(name: string): number {
    const value = this.fields[name]
    if (typeof value === 'number' && Number.isInteger(value)) {
      return value
    }
    throw this.problem(name, 'a whole number')
  }

  flag(name: string): boolean {
    const value = this.fields[name]
    if (typeof value === 'boolean') {
      return value
    }
    throw this.problem(name, 'true or false')
  }

  oneOf<T extends string>(name: string, allowed: readonly T[]): T {
    const value = this.fields[name]
    const match = allowed.find((candidate) => candidate === value)
    if (match === undefined) {
      throw this.problem(name, `one of ${allowed.join(', ')}`)
    }
    return match
  }

  object(name: string): JsonFields {
    const value = this.fields[name]
    if (isRecord(value)) {
      return new JsonFields(value, this.file)
    }
    throw this.problem(name, 'an object')
  }

  optionalObject<T>(name: string, read: (fields: JsonFields) => T): T | undefined {
    return this.has(name) ? read(this.object(name)) : undefined
  }

  objects<T>(name: string, read: (fields: JsonFields) => T): T[] {
    const value = this.fields[name]
    if (Array.isArray(value)) {
      return value.map((entry: unknown) => read(JsonFields.from(entry, this.file)))
    }
    throw this.problem(name, 'a list')
  }

  nonEmptyObjects<T>(name: string, read: (fields: JsonFields) => T): [T, ...T[]] {
    const [first, ...rest] = this.objects(name, read)
    if (first === undefined) {
      throw this.problem(name, 'a list with at least one entry')
    }
    return [first, ...rest]
  }

  private problem(name: string, expected: string): BrokenFileError {
    return new BrokenFileError(this.file, `"${name}" must be ${expected}`)
  }
}
