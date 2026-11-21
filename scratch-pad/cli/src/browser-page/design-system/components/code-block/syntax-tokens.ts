export type SyntaxKind =
  'plain' | 'comment' | 'string' | 'keyword' | 'number' | 'fn' | 'type' | 'punct'

export interface SyntaxToken {
  readonly kind: SyntaxKind
  readonly text: string
}

const plainLanguages = new Set(['', 'text', 'txt', 'plain', 'md', 'markdown'])
const hashCommentLanguages = new Set([
  'sh',
  'bash',
  'zsh',
  'shell',
  'console',
  'py',
  'python',
  'rb',
  'ruby',
  'yaml',
  'yml',
  'toml',
  'make',
  'dockerfile',
])

const keywords = new Set(
  (
    'abstract and as async await break case catch chan class const continue def default defer ' +
    'del do done elif else enum esac export extends false fi finally fn for from func function ' +
    'go if impl implements import in instanceof interface is lambda let local match mod mut new ' +
    'nil none not null of or package pass private protected pub public range readonly return ' +
    'select self static struct super switch then this throw true try type typeof undefined use ' +
    'var void while with yield'
  ).split(' '),
)

const slashComment = String.raw`\/\/[^\n]*|\/\*[\s\S]*?\*\/`
const hashComment = String.raw`#[^\n]*`
const strings = String.raw`"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|` + '`(?:\\\\.|[^`\\\\])*`'
const numbers = String.raw`\b\d[\d_]*(?:\.\d+)?\b`
const words = String.raw`[A-Za-z_$][\w$]*`
const punctuation = String.raw`[{}()[\];,.:<>=+\-*/!&|?%^~@]+`

function patternFor(language: string): RegExp {
  const comment = hashCommentLanguages.has(language) ? hashComment : slashComment
  return new RegExp(
    `(${comment})|(${strings})|(${numbers})|(${words})|(${punctuation})|(\\s+|[^\\s])`,
    'g',
  )
}

function wordKind(word: string, rest: string): SyntaxKind {
  if (keywords.has(word.toLowerCase())) {
    return 'keyword'
  }
  if (rest.startsWith('(')) {
    return 'fn'
  }
  return /^[A-Z]/.test(word) ? 'type' : 'plain'
}

function kindOf(match: RegExpExecArray, code: string): SyntaxKind {
  const [text, comment, string, number, word, punct] = match
  if (comment !== undefined) {
    return 'comment'
  }
  if (string !== undefined) {
    return 'string'
  }
  if (number !== undefined) {
    return 'number'
  }
  if (word !== undefined) {
    return wordKind(word, code.slice(match.index + text.length))
  }
  return punct === undefined ? 'plain' : 'punct'
}

export function syntaxTokens(code: string, language: string | undefined): SyntaxToken[] {
  const name = (language ?? 'text').toLowerCase()
  if (plainLanguages.has(name)) {
    return [{ kind: 'plain', text: code }]
  }
  return [...code.matchAll(patternFor(name))].map((match) => ({
    kind: kindOf(match, code),
    text: match[0],
  }))
}

interface LinePiece extends SyntaxToken {
  readonly line: number
}

export function syntaxLines(tokens: readonly SyntaxToken[]): SyntaxToken[][] {
  const position = { line: 0 }
  const pieces: LinePiece[] = tokens.flatMap((token) =>
    token.text.split('\n').map((text, index) => {
      position.line += index === 0 ? 0 : 1
      return { kind: token.kind, text, line: position.line }
    }),
  )
  return Array.from({ length: position.line + 1 }, (_, line) =>
    pieces
      .filter((piece) => piece.line === line && piece.text !== '')
      .map(({ kind, text }) => ({ kind, text })),
  )
}
