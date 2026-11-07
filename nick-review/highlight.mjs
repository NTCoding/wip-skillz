// A small tokeniser, so a report needs no network and no build step. It covers
// what Nick reviews: TypeScript, JavaScript, Python, YAML, shell and JSON.
//
// One pass, left to right, with comments and strings matched first, so nothing
// inside a string is coloured as code.

const WORDS = [
  // javascript and typescript
  'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'of', 'in',
  'while', 'await', 'async', 'import', 'from', 'export', 'default', 'class',
  'extends', 'implements', 'interface', 'type', 'enum', 'new', 'try', 'catch',
  'finally', 'throw', 'typeof', 'instanceof', 'this', 'null', 'undefined',
  'true', 'false', 'void', 'readonly', 'public', 'private', 'protected',
  // python
  'def', 'elif', 'raise', 'with', 'as', 'pass', 'lambda', 'not', 'and', 'or',
  'is', 'None', 'True', 'False', 'yield', 'global', 'nonlocal', 'assert',
  // shell
  'fi', 'then', 'do', 'done', 'esac', 'case', 'echo', 'local',
]

const HASH = new Set(['py', 'yaml', 'yml', 'sh', 'bash', 'zsh', 'toml', 'conf', 'tsv'])
const SLASH = new Set(['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'css', 'scss', 'java', 'go', 'rs', 'c', 'h', 'cpp'])

const esc = s => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))

export function highlighter (file) {
  const ext = (file.split('.').pop() || '').toLowerCase()
  const comment = HASH.has(ext) ? '#[^\\n]*'
    : SLASH.has(ext) ? '\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/'
      : null

  // The order of the branches is the precedence. A comment or a string wins
  // over everything inside it.
  const token = new RegExp([
    ...(comment ? [`(?<comment>${comment})`] : []),
    "(?<string>'(?:\\\\.|[^'\\\\])*'|\"(?:\\\\.|[^\"\\\\])*\"|`(?:\\\\.|[^`\\\\])*`)",
    '(?<decorator>@[A-Za-z_$][\\w$]*)',
    `(?<word>\\b(?:${WORDS.join('|')})\\b)`,
    '(?<number>\\b\\d+(?:\\.\\d+)?\\b)',
    '(?<fn>\\b[A-Za-z_$][\\w$]*(?=\\s*\\())',
    '(?<type>\\b[A-Z][\\w$]*\\b)',
    '(?<key>^[ \\t]*[\\w.$-]+(?=\\s*:))',
  ].join('|'), 'gm')

  return text => {
    let out = ''
    let last = 0
    for (const m of text.matchAll(token)) {
      const kind = Object.keys(m.groups).find(k => m.groups[k] !== undefined)
      out += esc(text.slice(last, m.index)) + `<span class="t-${kind}">${esc(m[0])}</span>`
      last = m.index + m[0].length
    }
    return out + esc(text.slice(last))
  }
}
