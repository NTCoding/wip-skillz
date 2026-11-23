import { describe, expect, it } from 'vitest'
import {
  InvalidImprovementNumberError,
  InvalidPortError,
  InvalidSecondsError,
  InvalidSubtaskNumberError,
  InvalidTaskNumberError,
  MissingArgumentError,
  OptionValueError,
  PlacementError,
  RepeatedOptionError,
  SubtaskOfSubtaskError,
  UnknownItemTypeError,
  UnknownOptionError,
  improvementNumber,
  inboxTypes,
  milliseconds,
  parentTaskNumber,
  parseCommandWords,
  placementOf,
  portNumber,
  requiredWord,
  restOfWords,
  subtaskNumber,
  taskNumber,
  taskNumberFrom,
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
        before: undefined,
        after: undefined,
        do: undefined,
        why: undefined,
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
        before: undefined,
        after: undefined,
        do: undefined,
        why: undefined,
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
        before: undefined,
        after: undefined,
        do: undefined,
        why: undefined,
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
        before: undefined,
        after: undefined,
        do: undefined,
        why: undefined,
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
        before: undefined,
        after: undefined,
        do: undefined,
        why: undefined,
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

  it('throws OptionValueError when the value of --do is the name of another option', () => {
    const parse = () =>
      parseCommandWords(['task', 'assign', '3', '--do', '--why', '--why', 'No access'], noText)

    expect(parse).toThrow(OptionValueError)
    expect(parse).toThrow('--do needs a value, but the word after it is the option --why.')
  })

  it('throws RepeatedOptionError when --why is given twice', () => {
    const parse = () =>
      parseCommandWords(
        ['task', 'assign', '3', '--do', 'Run it', '--why', 'No access', '--why', 'No VPN'],
        noText,
      )

    expect(parse).toThrow(RepeatedOptionError)
    expect(parse).toThrow('--why is given more than once. Pass each option only once.')
  })

  it('keeps an option that is repeated in the text as part of the text', () => {
    const parsed = parseCommandWords(
      ['decide', '--pad', 'export', 'Retry 5 times', '--pad', 'export'],
      textAfterDecide,
    )

    expect([parsed.words, parsed.options.pad]).toStrictEqual([
      ['decide', 'Retry 5 times', '--pad', 'export'],
      'export',
    ])
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

  it.each(['0', '1.5.1', 'two', '-1'])(
    'throws InvalidTaskNumberError when the number is %s',
    (text) => {
      expect(() => taskNumber([text], 0, 'task done <number>')).toThrow(InvalidTaskNumberError)
      expect(() => taskNumber([text], 0, 'task done <number>')).toThrow(
        `"${text}" isn't a task number.`,
      )
    },
  )
})

describe('taskNumber of a subtask', () => {
  it('throws InvalidTaskNumberError that points to the subtask commands when the number is a subtask number', () => {
    expect(() => taskNumber(['2.1'], 0, 'task start <number>')).toThrow(
      '"2.1" is the number of a subtask. Run the subtask command for a subtask, like "scratch-pad subtask show 2.1". Usage: scratch-pad task start <number>',
    )
  })
})

describe('subtaskNumber', () => {
  const usage = 'subtask done <number>'

  it('returns the number of the task and the number of the subtask', () => {
    expect(subtaskNumber(['12.3'], 0, usage)).toStrictEqual({ task: 12, subtask: 3 })
  })

  it.each(['2', '2.0', '2.1.1', 'two'])(
    'throws InvalidSubtaskNumberError when the number is %s',
    (text) => {
      expect(() => subtaskNumber([text], 0, usage)).toThrow(InvalidSubtaskNumberError)
      expect(() => subtaskNumber([text], 0, usage)).toThrow(
        `"${text}" isn't a subtask number. A subtask number starts with the number of its task, like 2.1. Usage: scratch-pad ${usage}`,
      )
    },
  )

  it('throws MissingArgumentError when the number is missing', () => {
    expect(() => subtaskNumber([], 0, usage)).toThrow(
      `The subtask number is missing. Usage: scratch-pad ${usage}`,
    )
  })
})

describe('parentTaskNumber', () => {
  const usage = 'subtask add <task number> <title>'

  it('returns the number of the task', () => {
    expect(parentTaskNumber(['2', 'Retry'], 0, usage)).toBe(2)
  })

  it('throws SubtaskOfSubtaskError when the number is a subtask number', () => {
    expect(() => parentTaskNumber(['2.1'], 0, usage)).toThrow(SubtaskOfSubtaskError)
    expect(() => parentTaskNumber(['2.1'], 0, usage)).toThrow(
      `"2.1" is the number of a subtask, but a subtask can't have subtasks. Add the subtask to task 2 instead.`,
    )
  })
})

describe('placementOf', () => {
  const usage = 'task move <number> --before|--after <number>'
  const options = parseCommandWords([], noText).options
  const parse = (text: string) => taskNumberFrom(text, usage)

  it('returns before the target when --before is given', () => {
    expect(placementOf({ ...options, before: '2' }, usage, parse)).toStrictEqual({
      side: 'before',
      target: 2,
    })
  })

  it('returns after the target when --after is given', () => {
    expect(placementOf({ ...options, after: '3' }, usage, parse)).toStrictEqual({
      side: 'after',
      target: 3,
    })
  })

  it.each([
    ['neither', {}],
    ['both', { before: '1', after: '2' }],
  ])('throws PlacementError when %s of the options is given', (_, given) => {
    expect(() => placementOf({ ...options, ...given }, usage, parse)).toThrow(PlacementError)
    expect(() => placementOf({ ...options, ...given }, usage, parse)).toThrow(
      `Pass either --before <number> or --after <number>. Usage: scratch-pad ${usage}`,
    )
  })
})

describe('improvementNumber', () => {
  const usage = 'improvement delete <number>'

  it('returns the number', () => {
    expect(improvementNumber(['3'], 0, usage)).toBe(3)
  })

  it('throws InvalidImprovementNumberError when the number is 0', () => {
    expect(() => improvementNumber(['0'], 0, usage)).toThrow(InvalidImprovementNumberError)
    expect(() => improvementNumber(['0'], 0, usage)).toThrow(
      `"0" isn't an improvement number. Usage: scratch-pad ${usage}`,
    )
  })

  it('throws MissingArgumentError when the number is missing', () => {
    expect(() => improvementNumber([], 0, usage)).toThrow(
      `The improvement number is missing. Usage: scratch-pad ${usage}`,
    )
  })
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
