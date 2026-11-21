import { describe, expect, it } from 'vitest'
import {
  InvalidPortError,
  InvalidSecondsError,
  InvalidTaskNumberError,
  MissingArgumentError,
  OptionValueError,
  UnknownItemTypeError,
  UnknownOptionError,
  inboxTypes,
  milliseconds,
  parseCommandWords,
  portNumber,
  requiredWord,
  restOfWords,
  taskNumber,
} from './command-words'

const noText = () => false
const textAfterReplyId = (wordsBefore: readonly string[]) => wordsBefore.join(' ') === 'reply c-1'
const textAfterDecide = (wordsBefore: readonly string[]) => wordsBefore.join(' ') === 'decide'

describe('parseCommandWords', () => {
  it('separates the words from the options', () => {
    expect(
      parseCommandWords(['inbox', '--pad', 'export', '--type', 'grammar', '--all'], noText),
    ).toStrictEqual({
      words: ['inbox'],
      options: {
        pad: 'export',
        type: 'grammar',
        all: true,
        port: undefined,
        quiet: undefined,
        timeout: undefined,
        out: undefined,
      },
      givenOptions: ['pad', 'type', 'all'],
      help: false,
    })
  })

  it('returns no options when none are given', () => {
    expect(parseCommandWords(['reply', 'c-1', 'Done', 'now'], noText)).toStrictEqual({
      words: ['reply', 'c-1', 'Done', 'now'],
      options: {
        pad: undefined,
        type: undefined,
        all: false,
        port: undefined,
        quiet: undefined,
        timeout: undefined,
        out: undefined,
      },
      givenOptions: [],
      help: false,
    })
  })

  it('reads --help', () => {
    expect(parseCommandWords(['--help'], noText).help).toBe(true)
  })

  it('treats the words after -- as words even when they look like options', () => {
    expect(parseCommandWords(['decide', '--', '--all is fine'], noText).words).toStrictEqual([
      'decide',
      '--all is fine',
    ])
  })

  it('treats the text as words when the text starts with a dash', () => {
    expect(
      parseCommandWords(['reply', 'c-1', '- I changed the limit to 7'], textAfterReplyId).words,
    ).toStrictEqual(['reply', 'c-1', '- I changed the limit to 7'])
  })

  it('treats an option after the start of the text as part of the text', () => {
    expect(
      parseCommandWords(['reply', 'c-1', 'Run it with', '--help', '--all'], textAfterReplyId),
    ).toStrictEqual({
      words: ['reply', 'c-1', 'Run it with', '--help', '--all'],
      options: {
        pad: undefined,
        type: undefined,
        all: false,
        port: undefined,
        quiet: undefined,
        timeout: undefined,
        out: undefined,
      },
      givenOptions: [],
      help: false,
    })
  })

  it('treats --help as the first word of the text when more words follow it', () => {
    expect(
      parseCommandWords(['reply', 'c-1', '--help', 'prints', 'the', 'usage'], textAfterReplyId),
    ).toStrictEqual({
      words: ['reply', 'c-1', '--help', 'prints', 'the', 'usage'],
      options: {
        pad: undefined,
        type: undefined,
        all: false,
        port: undefined,
        quiet: undefined,
        timeout: undefined,
        out: undefined,
      },
      givenOptions: [],
      help: false,
    })
  })

  it('reads --help as an option when it is the last word at the start of the text', () => {
    expect(parseCommandWords(['reply', 'c-1', '--help'], textAfterReplyId).help).toBe(true)
  })

  it('reads --help as an option when it comes before the text', () => {
    expect(parseCommandWords(['reply', '--help', 'c-1', 'Done'], textAfterReplyId).help).toBe(true)
  })

  it('reads a known option before the text as an option', () => {
    expect(
      parseCommandWords(['reply', '--pad', 'export', 'c-1', 'Done'], textAfterReplyId),
    ).toStrictEqual({
      words: ['reply', 'c-1', 'Done'],
      options: {
        pad: 'export',
        type: undefined,
        all: false,
        port: undefined,
        quiet: undefined,
        timeout: undefined,
        out: undefined,
      },
      givenOptions: ['pad'],
      help: false,
    })
  })

  it('leaves out -- when -- comes before the text', () => {
    expect(
      parseCommandWords(['decide', '--', '-5 is too low'], textAfterDecide).words,
    ).toStrictEqual(['decide', '-5 is too low'])
  })

  it('throws UnknownOptionError when an option is unknown', () => {
    expect(() => parseCommandWords(['status', '--verbose'], noText)).toThrow(UnknownOptionError)
    expect(() => parseCommandWords(['status', '--verbose'], noText)).toThrow(
      `--verbose isn't an option. Run "scratch-pad help" to list the commands and options.`,
    )
  })

  it('throws OptionValueError when --pad has no value', () => {
    expect(() => parseCommandWords(['status', '--pad'], noText)).toThrow(OptionValueError)
    expect(() => parseCommandWords(['status', '--pad'], noText)).toThrow('--pad needs a value.')
  })

  it('throws OptionValueError when --all has a value', () => {
    const parse = () => parseCommandWords(['inbox', '--all=yes'], noText)

    expect(parse).toThrow(OptionValueError)
    expect(parse).toThrow("--all doesn't take a value.")
  })
})

describe('requiredWord', () => {
  it('returns the word at the index', () => {
    expect(requiredWord(['c-1', 'text'], 0, 'id', 'show <id>')).toBe('c-1')
  })

  it.each([[[]], [['  ']]])(
    'throws MissingArgumentError with the usage when the words are %j',
    (words) => {
      expect(() => requiredWord(words, 0, 'id', 'show <id>')).toThrow(MissingArgumentError)
      expect(() => requiredWord(words, 0, 'id', 'show <id>')).toThrow(
        'The id is missing. Usage: scratch-pad show <id>',
      )
    },
  )
})

describe('restOfWords', () => {
  it('joins the words from the index with spaces', () => {
    expect(restOfWords(['c-1', 'I raised', 'the limit'], 1, 'text', 'reply <id> <text>')).toBe(
      'I raised the limit',
    )
  })

  it('throws MissingArgumentError when there are no words from the index', () => {
    const rest = () => restOfWords(['c-1'], 1, 'text', 'reply <id> <text>')

    expect(rest).toThrow(MissingArgumentError)
    expect(rest).toThrow('The text is missing. Usage: scratch-pad reply <id> <text>')
  })
})

describe('taskNumber', () => {
  it('returns the number', () => {
    expect(taskNumber(['12'], 0, 'task done <number>')).toBe(12)
  })

  it.each(['0', '1.5', 'two', '-1'])(
    'throws InvalidTaskNumberError when the number is %s',
    (text) => {
      expect(() => taskNumber([text], 0, 'task done <number>')).toThrow(InvalidTaskNumberError)
      expect(() => taskNumber([text], 0, 'task done <number>')).toThrow(
        `"${text}" isn't a task number.`,
      )
    },
  )
})

describe('inboxTypes', () => {
  it('returns comments and decisions when no type is given', () => {
    expect(inboxTypes(undefined)).toStrictEqual(['comment', 'decision'])
  })

  it('returns the listed types', () => {
    expect(inboxTypes('grammar, improvement')).toStrictEqual(['grammar', 'improvement'])
  })

  it('throws UnknownItemTypeError that lists the types when a type is unknown', () => {
    expect(() => inboxTypes('grammar,typo')).toThrow(UnknownItemTypeError)
    expect(() => inboxTypes('grammar,typo')).toThrow(
      '"typo" isn\'t a type. The types are: comment, decision, grammar, improvement',
    )
  })
})

describe('portNumber', () => {
  it('returns the default port when no port is given', () => {
    expect(portNumber(undefined, 4747)).toBe(4747)
  })

  it.each([
    ['0', 0],
    ['8080', 8080],
    ['65535', 65_535],
  ])('returns the port when the port is %s', (text, port) => {
    expect(portNumber(text, 4747)).toBe(port)
  })

  it.each(['65536', '-1', 'web', '123456'])(
    'throws InvalidPortError when the port is %s',
    (text) => {
      expect(() => portNumber(text, 4747)).toThrow(InvalidPortError)
      expect(() => portNumber(text, 4747)).toThrow(
        `"${text}" isn't a port. A port is a whole number from 0 to 65535.`,
      )
    },
  )
})

describe('milliseconds', () => {
  it('returns undefined when the option is not given', () => {
    expect(milliseconds('timeout', undefined)).toBeUndefined()
  })

  it.each([
    ['10', 10_000],
    ['0', 0],
    ['0.5', 500],
  ])('returns the milliseconds when the seconds are %s', (text, result) => {
    expect(milliseconds('quiet', text)).toBe(result)
  })

  it.each(['ten', '-1', '1e3'])('throws InvalidSecondsError when the seconds are %s', (text) => {
    expect(() => milliseconds('quiet', text)).toThrow(InvalidSecondsError)
    expect(() => milliseconds('quiet', text)).toThrow(
      `--quiet needs a number of seconds, like 10. "${text}" isn't a number of seconds.`,
    )
  })
})
