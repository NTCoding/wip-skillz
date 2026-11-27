import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { resolve, basename } from 'node:path'
import { highlighter } from '../nick-review/highlight.mjs'

const [,, srcPath, outPath] = process.argv
const src = readFileSync(srcPath, 'utf8')

const front = /^---\n([\s\S]*?)\n---\n/.exec(src)
if (!front) throw new Error('the walkthrough has no front matter')
const meta = Object.fromEntries(front[1].split('\n').filter(Boolean).map(l => {
  const i = l.indexOf(':')
  return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
}))
for (const key of ['iid', 'title', 'url', 'author', 'base', 'head']) {
  if (!meta[key]) throw new Error(`the front matter has no "${key}"`)
}
const CONTEXTS = front[1].split('\n').filter(l => l.startsWith('context:')).map((l, i) => {
  const [prefix, name, pkg] = l.slice('context:'.length).split('=').map(s => s.trim())
  return { prefix, name, pkg, n: i % 10 }
})
// A "folder:" line covers the files under a folder that isn't a context. The page draws it in grey.
const FOLDERS = front[1].split('\n').filter(l => l.startsWith('folder:')).map(l => l.slice('folder:'.length).trim()).map(top => ({ prefix: `${top}/`, name: `${top} folder`, n: 'x' }))
const ROOT = { prefix: '', name: 'root of the repository', n: 'x' }
if (!CONTEXTS.length && !FOLDERS.length) throw new Error('the front matter has no "context:" or "folder:" line. Write one per context: "context: <path prefix> = <name> = <package name>"')
const contextOf = file => !file.includes('/') ? ROOT : [...CONTEXTS, ...FOLDERS].filter(c => file.startsWith(c.prefix)).sort((a, b) => b.prefix.length - a.prefix.length)[0]
const REPO = meta.url.replace(/\/-\/merge_requests\/.*$/, '')

// ── git ──────────────────────────────────────────────────────────────────
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] })
const fileCache = new Map()
function fileAt (ref, file) {
  const key = `${ref}:${file}`
  if (!fileCache.has(key)) {
    let text
    try { text = git('show', key) } catch { text = undefined }
    fileCache.set(key, text === undefined ? undefined : text.split('\n'))
  }
  return fileCache.get(key)
}

const changed = new Map()
for (const row of git('diff', '--numstat', '-M', meta.base, meta.head).split('\n').filter(Boolean)) {
  const [added, removed, ...rest] = row.split('\t')
  changed.set(rest[rest.length - 1], { added: Number(added) || 0, removed: Number(removed) || 0, status: 'M', shownIn: new Set() })
}
for (const row of git('diff', '--name-status', '-M', meta.base, meta.head).split('\n').filter(Boolean)) {
  const [status, ...rest] = row.split('\t')
  const entry = changed.get(rest[rest.length - 1])
  if (entry) entry.status = status[0]
}

const addedCache = new Map()
function addedLines (file) {
  if (!addedCache.has(file)) {
    const set = new Set()
    if (changed.has(file)) {
      for (const m of git('diff', '-U0', meta.base, meta.head, '--', file).matchAll(/^@@ -\S+ \+(\d+)(?:,(\d+))? @@/gm)) {
        const start = Number(m[1]); const count = m[2] === undefined ? 1 : Number(m[2])
        for (let n = start; n < start + count; n++) set.add(n)
      }
    }
    addedCache.set(file, set)
  }
  return addedCache.get(file)
}

const symbols = new Map()
const baseNames = new Map()
const methods = new Map()
const declarations = []
const KEYWORDS = new Set(['if', 'for', 'while', 'switch', 'return', 'super', 'constructor', 'catch', 'throw', 'await'])
function index (file) {
  const name = basename(file)
  baseNames.set(name, baseNames.has(name) ? null : file)
  if (!/\.(ts|tsx|mjs|js)$/.test(file)) return
  const lines = fileAt(meta.head, file)
  if (!lines) return
  lines.forEach((line, i) => {
    const m = /^export (?:default )?(?:abstract )?(?:async )?(?:class|interface|type|const|function|enum) (\w+)/.exec(line)
    if (m && !symbols.has(m[1])) symbols.set(m[1], { file, line: i + 1 })
    if (m) declarations.push({ name: m[1], file, line: i + 1, text: line })
    const method = /^  (?:static |private |readonly |async |get )*(#?[a-z]\w*)(?:<[^>]*>)?\(/.exec(line)
    if (method && !KEYWORDS.has(method[1])) methods.set(method[1], methods.has(method[1]) ? null : { file, line: i + 1 })
  })
}
for (const [file, entry] of changed) if (entry.status !== 'D') index(file)

const blob = (file, line, ref = meta.head) => `${REPO}/-/blob/${ref}/${file}${line ? `#L${line}` : ''}`

// ── inline text ──────────────────────────────────────────────────────────
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

function target (name) {
  const head = name.split(/[.(<]/)[0]
  const found = symbols.get(name) ?? symbols.get(head) ?? methods.get(name) ?? methods.get(name.split('.').pop())
  if (found) return blob(found.file, found.line)
  if (changed.has(name)) return blob(name)
  if (/^[\w.-]+(\/[\w.-]+)+$/.test(name) && fileAt(meta.head, name)) return blob(name)
  const file = baseNames.get(name)
  return file ? blob(file) : undefined
}

const CONTEXT_NAMES = !CONTEXTS.length ? /(?!)/g : new RegExp(CONTEXTS.map(c => esc(c.name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).sort((a, b) => b.length - a.length).join('|'), 'g')
const badges = text => text.split(/(`[^`]+`)/).map((part, i) => i % 2 ? part
  : part.replace(CONTEXT_NAMES, name => `<span class="ctx inl c${CONTEXTS.find(c => esc(c.name) === name).n}">${name}</span>`)).join('')

function inline (text) {
  return badges(esc(text))
    .replace(/`([^`]+)`/g, (_, code) => {
      const raw = code.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
      const href = target(raw)
      return href ? `<a class="sym" href="${esc(href)}"><code>${code}</code></a>` : `<code>${code}</code>`
    })
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) =>
      `<a href="${/^https?:|^#/.test(href) ? href : esc(blob(href))}">${label}</a>`)
}

// ── the markdown source ──────────────────────────────────────────────────
const tabs = []
let tab; let point; let passage; let para = []
const errors = []
const notices = []
const shownBlocks = []

const MAX_SENTENCES = 4
const flush = () => {
  if (!para.length) return
  const text = para.join(' ')
  const sentences = (text.replace(/`[^`]*`/g, 'x').match(/[.?!](?=\s|$)|:$/g) || []).length
  if (sentences > MAX_SENTENCES) errors.push(`under "${point?.title || tab.title}": this paragraph has ${sentences} sentences. The limit is ${MAX_SENTENCES} sentences:\n    ${text.slice(0, 90)}…`)
  // The first paragraph of a tab is drawn as the heading of the tab.
  if (!point && sentences > 1) errors.push(`under "${tab.title}": the first paragraph of a tab is its heading so it has one sentence. This one has ${sentences}:\n    ${text.slice(0, 90)}…`)
  push({ type: 'text', text })
  para = []
}
const KIND = { text: 'paragraph', list: 'list', table: 'table', quote: 'quote', code: 'code block', flow: 'flow block', types: 'types block' }
// Inside a "## " point, every block belongs to the "### " passage above it. The point's intro, before the first "### ",
// only has paragraphs, lists (such as the table of contents) and "> ⚠️" blocks. A "> ⚠️" block ends the passage above it.
const push = block => {
  if (!point) { point = { title: '', blocks: [] }; tab.points.push(point) }
  if (!point.title) { point.blocks.push(block); return }
  if (block.type === 'attention') { passage = undefined; (point.parts.length ? point.parts : point.intro).push(block); return }
  if (passage) { passage.blocks.push(block); return }
  if (!point.parts.length && (block.type === 'text' || block.type === 'list')) { point.intro.push(block); return }
  const text = block.text ?? block.items?.[0] ?? block.head?.join(' | ') ?? block.file ?? block.body?.[0] ?? ''
  errors.push(`under "${point.title}": this ${KIND[block.type]} isn't under a "### " title. Start each passage with a "### <title>" line${point.parts.length ? ', including after a "> ⚠️" block' : '. Before the first "### " title, a point only has its intro paragraphs, its request block or table of contents and "> ⚠️" blocks'}:\n    ${String(text).slice(0, 90)}`)
}

function addRequest (body) {
  if (!point?.title) { errors.push(`a request block is only allowed under a "## " heading:\n    ${body[0]}`); return }
  if (point.parts.length) { errors.push(`under "${point.title}": the request block belongs before the first "### " title:\n    ${body[0]}`); return }
  // The agent adds this empty block once it has read the point and decided that the point follows one request.
  const lines = body.filter(l => l.trim())
  if (lines.length) { errors.push(`under "${point.title}": a request block is always empty, because it only marks a point that follows one request. Remove the lines of the block:\n    ${lines[0]}`); return }
  point.request = true
}

const lines = src.slice(front[0].length).split('\n')
for (let i = 0; i < lines.length; i++) {
  const line = lines[i]
  if (line.startsWith('# ')) { flush(); tab = { title: line.slice(2).trim(), points: [] }; tabs.push(tab); point = undefined; passage = undefined; continue }
  if (!tab) { if (line.trim()) throw new Error(`line before the first "# " heading: ${line}`); continue }
  if (line.startsWith('## ')) {
    flush()
    const named = /^(.*?)\s*\{([^}]+)\}$/.exec(line.slice(3).trim())
    if (!named) errors.push(`this "## " heading doesn't end with a {label}:\n    ${line}`)
    point = { title: named ? named[1] : line.slice(3).trim(), short: named?.[2], intro: [], parts: [] }; passage = undefined; tab.points.push(point); continue
  }
  if (line.startsWith('### ')) {
    flush()
    if (!point?.title) { errors.push(`a "### " title is only allowed under a "## " heading:\n    ${line}`); continue }
    // The short name in braces is cut off the title.
    const named = /^(.*?)\s*\{([^}]+)\}$/.exec(line.slice(4).trim())
    passage = { title: named ? named[1] : line.slice(4).trim(), short: named?.[2], blocks: [] }; point.parts.push(passage); continue
  }
  if (line.startsWith('```')) {
    flush()
    const [lang = '', file, ref] = line.slice(3).trim().split(/\s+/)
    const body = []
    for (i++; i < lines.length && !lines[i].startsWith('```'); i++) body.push(lines[i])
    if (lang === 'request') { addRequest(body); continue }
    push(lang === 'flow' || lang === 'types' ? { type: lang, body } : { type: 'code', lang, file, ref: ref === '@base' ? 'base' : 'head', body })
    continue
  }
  if (line.startsWith('|')) {
    flush()
    const rows = []
    for (; i < lines.length && lines[i].startsWith('|'); i++) rows.push(lines[i].slice(1, lines[i].lastIndexOf('|')).split('|').map(c => c.trim()))
    i--
    push({ type: 'table', head: rows[0], rows: rows.slice(2) })
    continue
  }
  if (line.startsWith('>')) {
    flush()
    const body = []
    for (; i < lines.length && lines[i].startsWith('>'); i++) body.push(lines[i].replace(/^>\s?/, ''))
    i--
    const text = body.join(' ').trim()
    if (!text.startsWith('⚠️')) { push({ type: 'quote', text }); continue }
    const titled = /^\*\*(.+?)\*\*\s*(.*)$/.exec(text.slice(2).trim())
    if (!titled) errors.push(`under "${point?.title || tab.title}": this "> ⚠️" block doesn't have a title. Start the block with a short title in bold, as in "> ⚠️ **<title>** <text>":\n    ${text.slice(0, 90)}`)
    push({ type: 'attention', heading: titled?.[1] ?? '', text: titled?.[2] ?? text.slice(2).trim() })
    continue
  }
  if (/^(\d+\.|-) /.test(line)) {
    flush()
    const items = []; const ordered = /^\d/.test(line)
    for (; i < lines.length && /^(\d+\.|-) /.test(lines[i]); i++) items.push(lines[i].replace(/^(\d+\.|-) /, ''))
    i--
    push({ type: 'list', ordered, items })
    continue
  }
  if (!line.trim()) { flush(); continue }
  para.push(line.trim())
}
flush()

// ── code blocks ──────────────────────────────────────
const GAP = /^\s*(\/\/|#)?\s*…\s*$/
// "//~ <note>" is a note on one line. "//~[ <note>" starts a note on several lines and "//~]" ends it on its last line.
const NOTE = / \/\/~([[\]]?)(?: (.*))?$/

function splitNote (raw) {
  const m = NOTE.exec(raw)
  if (!m) return { text: raw }
  return { text: raw.slice(0, m.index), mark: m[1] || '~', note: (m[2] ?? '').trim() }
}

function locate (block, where) {
  if (!block.file) return block.body.map(text => ({ text }))
  const ref = block.ref === 'base' ? meta.base : meta.head
  const fileLines = fileAt(ref, block.file)
  if (!fileLines) { errors.push(`${where}: ${block.file} doesn't exist at ${block.ref}`); return [] }
  if (!contextOf(block.file)) errors.push(`${where}: ${block.file} isn't under any "context:" or "folder:" line of the front matter`)
  const trimmed = fileLines.map(l => l.trim())
  const added = block.ref === 'base' ? new Set() : addedLines(block.file)
  const indent = s => /^\s*/.exec(s)[0].length
  let cursor = 0
  let shift
  return block.body.map(raw => {
    const { text, note, mark } = splitNote(raw)
    if (GAP.test(text)) return { gap: true, mark }
    if (!text.trim()) return { text: '', note, mark }
    let at = -1
    // A line of closing brackets matches many lines of the file. The first one below the last match is often the end of
    // an inner block. So the line is also matched by the indentation that the block shows.
    if (shift !== undefined && /^[)\]}]+[;,)]*$/.test(text.trim())) {
      const want = indent(text) + shift
      for (let k = cursor; k < trimmed.length && at === -1; k++) if (trimmed[k] === text.trim() && indent(fileLines[k]) === want) at = k
    }
    if (at === -1) at = trimmed.indexOf(text.trim(), cursor)
    if (at === -1) at = trimmed.indexOf(text.trim())
    if (at === -1) { errors.push(`${where}: this line isn't in ${block.file} at ${block.ref}:\n    ${text.trim()}`); return { text, note, mark } }
    cursor = at + 1
    shift ??= indent(fileLines[at]) - indent(text)
    return { text, note, mark, n: at + 1, add: added.has(at + 1) }
  })
}

// In a TypeScript or JavaScript file, the agent only copies the lines that a passage is about. This adds the signature line of the
// method that contains them and the line that closes the method, with a gap on each side. A signature can span several lines.
// In a file of any other language, nothing is added.
const MODIFIERS = '(?:(?:static|private|public|protected|readonly|async)\\s+)*'
const NAME = `(?:export\\s+)?${MODIFIERS}(function\\b|#?[\\w$]+)\\s*\\(`
const DECLARES = new RegExp(`^\\s*${NAME}.*\\)\\s*(?::\\s*[^{]+)?\\{\\s*$`)
const OPENS = new RegExp(`^\\s*${NAME}$`)
const CLOSES = /^\s*\)\s*(?::\s*[^{]+)?\{\s*$/
const named = (re, l) => { const m = re.exec(l); return m && !KEYWORDS.has(m[1]) }
const indentOf = s => /^\s*/.exec(s)[0].length
const TOP_LEVEL = /^(?:export\s+)?(?:async\s+)?(?:function\b|interface\s)/
function enclose (rows, b, where) {
  const first = rows.find(r => r.n)?.n; const last = rows.findLast(r => r.n)?.n
  if (!first || !/\.(ts|tsx|mjs|js)$/.test(b.file)) return rows
  const fileLines = fileAt(b.ref === 'base' ? meta.base : meta.head, b.file)
  const added = b.ref === 'base' ? new Set() : addedLines(b.file)
  // When the first copied line is the signature, the agent copied the whole method.
  const signature = fileLines[first - 1]
  if (named(DECLARES, signature) || named(OPENS, signature) || (indentOf(signature) === 0 && TOP_LEVEL.test(signature))) return rows
  let top; let open
  for (let k = first - 1; k > 0 && !top; k--) {
    if (named(DECLARES, fileLines[k - 1])) { top = k; open = k }
    else if (CLOSES.test(fileLines[k - 1])) {
      let o = k - 1; while (o > 0 && !named(OPENS, fileLines[o - 1])) o--
      if (o && indentOf(fileLines[o - 1]) === indentOf(fileLines[k - 1])) { top = o; open = k }
    }
  }
  if (!top) return rows
  const depth = indentOf(fileLines[top - 1])
  const closes = k => indentOf(fileLines[k]) === depth && /^\s*\}/.test(fileLines[k])
  let end = last; if (!closes(last - 1)) while (end < fileLines.length && !closes(end)) end++
  const row = k => ({ text: fileLines[k - 1], n: k, add: added.has(k) })
  const gap = () => ({ gap: true })
  const head = []; for (let k = top; k <= open; k++) head.push(row(k))
  notices.push(`${where}: added the signature line "${fileLines[top - 1].trim()}"${closes(last - 1) ? '' : ' and the closing line'}`)
  return [...head, gap(), ...rows, ...(closes(last - 1) ? [] : [gap(), row(end + 1)])]
}

// Each note of a block is numbered from 1. A row that a note is about is given the number of the note as "k".
function numberNotes (b, where) {
  b.notes = []
  let open
  const fail = (r, problem) => errors.push(`${where}: ${problem}:\n    ${r.gap ? '…' : r.text.trim()}`)
  b.rows.forEach((r, i) => {
    if (r.mark && r.gap) { fail(r, 'a note can\'t start or end on a "…" line'); return }
    if (r.mark === '~' && r.note) {
      if (open) { fail(r, 'this "//~" note is inside a note that was started with "//~[" on an earlier line. End that note with "//~]" first'); return }
      b.notes.push({ k: b.notes.length + 1, first: i, last: i, text: r.note }); r.k = b.notes.length; return
    }
    if (r.mark === '[') {
      if (!r.note) { fail(r, 'this "//~[" starts a note without any text. Write the note after it, as in "//~[ <note>"'); return }
      if (open) { fail(r, 'this "//~[" starts a note while the note that was started on an earlier line is still open. End that note with "//~]" first'); return }
      open = { k: b.notes.length + 1, first: i, last: i, text: r.note }; b.notes.push(open); r.k = open.k; return
    }
    if (r.mark === ']') {
      if (r.note) fail(r, 'a "//~]" ends a note, so it doesn\'t take any text. Write the text after the "//~[" on the first line of the note')
      if (!open) { fail(r, 'this "//~]" doesn\'t end any note. Start the note with "//~[ <note>" on its first line'); return }
      open.last = i; r.k = open.k; open = undefined; return
    }
    if (open && !r.gap) r.k = open.k
  })
  if (open) fail(b.rows[open.first], 'the note that is started with "//~[" on this line isn\'t ended. Add "//~]" to its last line')
}

// Ids: "t1p3" is the 3rd "## " point of the 1st "# " tab ("t1p0" is the overview). "t1p3.b2" is the 2nd "### " passage
// of that point. "t1p3.w1" is the 1st "> ⚠️" block of that point.
let attention = 0
const isToc = b => b.type === 'list' && b.items.some(item => /^\*\*[^*]+\*\*:/.test(item))
tabs.forEach((t, ti) => t.points.forEach((p, pi) => {
  p.id = `t${ti + 1}p${pi + (t.points[0].title ? 1 : 0)}`
  let n = 0; let w = 0
  const code = (b, where) => {
    b.rows = enclose(locate(b, where), b, where)
    if (b.file && b.ref === 'head') shownBlocks.push(b)
    if (b.file) numberNotes(b, where)
    else b.notes = []
    b.first = b.rows.find(r => r.n)?.n
    if (b.file && changed.has(b.file) && b.ref === 'head') changed.get(b.file).shownIn.add(p.id)
  }
  for (const b of p.title ? [...p.intro, ...p.parts] : p.blocks) {
    if (b.type === 'attention') { b.id = `${p.id}.w${++w}`; p.attention = true; attention++; continue }
    if (b.type === 'code') { code(b, `"${p.title || 'Overview'}"`); continue }
    if (!b.title) continue
    b.n = ++n; b.id = `${p.id}.b${n}`
    for (const c of b.blocks) if (c.type === 'code') code(c, `"${p.title}", passage ${n} "${b.title}"`)
  }
  if (!p.title) return
  p.passages = p.parts.filter(x => x.title)
  // The table of contents has one item for each passage of the point.
  for (const b of p.intro.filter(isToc)) {
    if (b.items.length !== p.passages.length) errors.push(`under "${p.title}": the table of contents has ${b.items.length} items, but the point has ${p.passages.length} passages`)
  }
}))
// An added line in an index.ts or a package.json is a change at the boundary of a context. It has to be shown in a code block.
let boundaryFile
const boundary = git('diff', '-U0', meta.base, meta.head, '--', '*/index.ts', '*/package.json').split('\n').flatMap(l => {
  if (l.startsWith('+++ b/')) boundaryFile = l.slice(6)
  const text = l.slice(1).trim()
  return l.startsWith('+') && !l.startsWith('+++') && text && !text.startsWith('//') ? [{ file: boundaryFile, text }] : []
})
const shownLines = new Set(shownBlocks.flatMap(b => b.rows.map(r => `${b.file}\t${(r.text ?? '').trim()}`)))
const missing = boundary.filter(b => !shownLines.has(`${b.file}\t${b.text}`))
if (missing.length) errors.push(`${missing.length} boundary changes aren't shown in any code block:\n${missing.map(b => `  ${b.file}  ${b.text}`).join('\n')}`)
if (errors.length) throw new Error(`${errors.length} problems in the source:\n\n${errors.join('\n\n')}`)

// ── what the page shows about each passage ───────────────────────────────
// The first sentence of a paragraph. A full stop inside backticks doesn't end the sentence.
function firstSentence (text) {
  const masked = text.replace(/`[^`]*`/g, span => 'x'.repeat(span.length))
  const end = /[.?!](?=\s|$)/.exec(masked)
  return end ? text.slice(0, end.index + 1) : text
}
const flowSteps = b => b.body.filter(l => l.trim()).map(l => {
  const m = /^(.+?)\s*(-->|->)\s*(.+?):\s*(.+?)(?:\s+@(\d+)(?:\.(\d+))?)?$/.exec(l.trim())
  if (!m) throw new Error(`this line of a flow block isn't "<from> -> <to>: <label> @<point>.<passage>":\n  ${l}`)
  return { from: m[1], dashed: m[2] === '-->', to: m[3], label: m[4], point: m[5], passage: m[6] }
})
// A name in a flow block is often the name of a context without its last word, such as "billing" for "billing context".
const contextNamed = name => CONTEXTS.find(c => [c.name, c.name.replace(/ (context|app|folder|tool)$/, '')].some(v => v.toLowerCase() === name.toLowerCase()))

for (const t of tabs) {
  const flow = t.points[0]?.title ? undefined : t.points[0]?.blocks.find(b => b.type === 'flow')
  const calls = flow ? flowSteps(flow) : []
  t.points.filter(p => p.title).forEach((p, pi) => {
    p.n = pi + 1
    // The calls of the tab's flow block that are tagged with the number of this point.
    p.calls = calls.filter(s => s.point === String(p.n))
    p.who = [...new Set(p.calls.flatMap(s => [s.from, s.to]))].map(name => ({ name, ctx: contextNamed(name) }))
    const toc = p.intro.find(isToc)
    p.warnings = p.intro.filter(b => b.type === 'attention')
    let above
    for (const part of p.parts) {
      if (part.title) { above = part; part.warnings = []; continue }
      above.warnings.push(part)
    }
    p.passages.forEach((x, i) => {
      // The context of a passage is the context of its first code block that has a path. The other contexts of the
      // passage are the contexts of its other code blocks and the contexts that its lines import.
      x.files = x.blocks.filter(b => b.type === 'code' && b.file)
      x.files.forEach((b, k) => { b.g = `${x.id}-${k}` })
      const own = [...new Set(x.files.map(b => contextOf(b.file)))]
      const lines = x.files.flatMap(b => b.rows.map(r => r.text ?? ''))
      x.ctxs = [...own, ...CONTEXTS.filter(c => !own.includes(c) && c.pkg && lines.some(l => l.includes(`'${c.pkg}'`)))]
      x.lane = own[0]
      x.noteCount = x.files.reduce((sum, b) => sum + b.notes.length, 0)
      const item = /^\*\*([^*]+)\*\*:\s*(.*)$/.exec(toc?.items[i] ?? '')
      x.label = item?.[1]
      x.blurb = item?.[2] || firstSentence(x.blocks.find(b => b.type === 'text')?.text ?? '')
      x.who = p.who.findIndex(w => w.ctx && w.ctx === x.lane)
    })
  })
}

// ── html ─────────────────────────────────────────────────────────────────
const STATUS = { A: ['new file', 'b1'], M: ['changed', 'b2'], R: ['renamed', 'b2'], D: ['deleted', 'b3'] }
const FOLD = 50

function linkTypes (html, own) {
  return html.replace(/<span class="t-(type|fn)">([\w$]+)<\/span>/g, (all, kind, name) => {
    const sym = symbols.get(name)
    if (!sym || (sym.file === own.file && sym.line === own.n)) return all
    return `<a class="t-${kind} sym" href="${esc(blob(sym.file, sym.line))}">${name}</a>`
  })
}

function codeBlock (b) {
  const paint = highlighter(b.file || `x.${b.lang}`)
  const entry = b.file && changed.get(b.file)
  const isNew = entry?.status === 'A'
  const [label, cls] = b.ref === 'base' ? ['target branch', 'b3']
    : entry ? STATUS[entry.status] ?? STATUS.M : ['unchanged', 'b0']
  const ref = b.ref === 'base' ? meta.base : meta.head
  const own = b.file && contextOf(b.file)
  const cross = text => CONTEXTS.filter(c => c !== own && c.pkg && text.includes(`'${c.pkg}'`)).map(c => `<span class="why cross c${c.n}">from the ${esc(c.name)}</span>`).join('')
  const starts = new Map(b.notes.map(note => [note.first, note]))
  const rows = b.rows.map((r, i) => {
    if (r.gap) return '<span class="ln gap"><span class="no"></span>⋯</span>'
    const note = starts.get(i)
    return `<span class="ln${r.add && !isNew ? ' add' : ''}${r.k ? ' mk' : ''}" data-i="${i}"${r.k ? ` data-k="${r.k}"` : ''}><span class="no">${r.n ?? ''}</span>${note ? `<button type="button" class="nb" data-k="${note.k}" aria-label="Note ${note.k}">${note.k}</button>` : ''}${linkTypes(paint(r.text), { file: b.file, n: r.n }) || ' '}${cross(r.text)}</span>`
  }).join('')
  const name = b.file ? b.file.split('/').pop() : ''
  const dir = b.file ? b.file.slice(0, -name.length) : ''
  const head = b.file ? `
        <div class="file">
          ${own ? `<span class="ctx c${own.n}">${esc(own.name)}</span>` : ''}
          <a class="fpath" href="${esc(blob(b.file, b.first, ref))}" title="${esc(b.file)}"><span class="dir">${esc(dir).replace(/\//g, '/<wbr>')}</span><b>${esc(name)}</b></a>
          <span class="chip ${cls}">${label}</span>
          <button class="copy" type="button">Copy</button>
        </div>` : ''
  const fold = b.rows.length > FOLD
  return `<div class="code${fold ? ' folded' : ''}"${own ? ` data-ctx="c${own.n}"` : ''}${b.g ? ` data-g="${b.g}"` : ''}>${head}<pre>${rows}</pre>${fold ? `<button class="unfold" type="button">Show all ${b.rows.length} lines</button>` : ''}</div>`
}

const ICON = {
  left: '<svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M9.78 12.78a.75.75 0 0 1-1.06 0L4.47 8.53a.75.75 0 0 1 0-1.06l4.25-4.25a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042L6.06 8l3.72 3.72a.75.75 0 0 1 0 1.06Z"/></svg>',
  right: '<svg class="chev" viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06Z"/></svg>',
  file: '<svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0 1 13.25 16h-9.5A1.75 1.75 0 0 1 2 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h9.5a.25.25 0 0 0 .25-.25V6h-2.75A1.75 1.75 0 0 1 9 4.25V1.5Zm6.75.062V4.25c0 .138.112.25.25.25h2.688l-.011-.013-2.914-2.914-.013-.011Z"/></svg>',
  contexts: '<svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor" aria-hidden="true"><path d="M1.5 1.5h5v5h-5Zm8 0h5v5h-5Zm-8 8h5v5h-5Zm8 0h5v5h-5Z"/></svg>',
  passages: '<svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor" aria-hidden="true"><path d="M1 2.5h14v2H1Zm0 4.5h14v2H1Zm0 4.5h14v2H1Z"/></svg>',
  expand: '<svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M8 1.2 4.6 4.6l1 1L8 3.2l2.4 2.4 1-1ZM8 14.8l3.4-3.4-1-1L8 12.8l-2.4-2.4-1 1Z"/></svg>',
  collapse: '<svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M8 7.2 5.6 4.8l-1 1L8 9.2l3.4-3.4-1-1ZM8 8.8l-3.4 3.4 1 1L8 10.8l2.4 2.4 1-1Z"/></svg>'
}

// The name of a note is the first name in backticks in the note that is also in the lines of the note. A note without a
// name like that is named after the code of its first line.
function noteName (b, note) {
  const code = b.rows.slice(note.first, note.last + 1).map(r => r.text ?? '').join('\n')
  const names = [...note.text.matchAll(/`([^`]+)`/g)].map(m => m[1]).filter(name => code.includes(name.replace(/\(\)$/, '')))
  // When a note has both "Invoice" and "Invoice.create", the longer name is the more precise one.
  return names.find(name => name !== names[0] && name.includes(names[0])) ?? names[0] ?? (b.rows[note.first].text ?? '').trim()
}

// The notes of one code block, as a panel in the text of the passage. Each row has the same number as the badge on the code.
function notesPanel (b) {
  if (!b.notes.length) return ''
  const own = contextOf(b.file)
  const lines = note => {
    const [first, last] = [b.rows[note.first].n, b.rows[note.last].n]
    return first === last ? `line ${first}` : `lines ${first}–${last}`
  }
  return `<div class="ghp"${own ? ` data-ctx="c${own.n}"` : ''}>
          <div class="ghp-top">
            <button type="button" class="ghp-h">${ICON.right}<span class="ghp-ht">${b.notes.length} ${b.notes.length === 1 ? 'note' : 'notes'}</span><span class="ghp-hf">${esc(b.file.split('/').pop())}</span></button>
            <button type="button" class="ghp-all" data-open="true" title="Expand all the notes on the page" aria-label="Expand all the notes on the page">${ICON.expand}</button>
            <button type="button" class="ghp-all" data-open="false" title="Collapse all the notes on the page" aria-label="Collapse all the notes on the page">${ICON.collapse}</button>
          </div>
          <ul class="ghp-rows">${b.notes.map(note => `
            <li class="ghp-row open" data-g="${b.g}" data-k="${note.k}"><button type="button" class="ghp-line"><span class="ghp-n">${note.k}</span><span class="ghp-at">${lines(note)}</span><span class="ghp-name">${esc(noteName(b, note))}</span></button><div class="ghp-exp">${inline(note.text)}</div></li>`).join('')}
          </ul>
        </div>`
}

function flowSvg (b) {
  const steps = flowSteps(b)
  const who = [...new Set(steps.flatMap(s => [s.from, s.to]))]
  const W = 1040; const col = W / who.length; const x = name => col * who.indexOf(name) + col / 2
  const top = 64; const gap = 46; const H = top + gap * steps.length + 24
  const head = who.map(name => `
    <rect x="${x(name) - 82}" y="8" width="164" height="36" rx="18" class="who"/>
    <text x="${x(name)}" y="31" text-anchor="middle" class="who-t">${esc(name)}</text>
    <line x1="${x(name)}" y1="44" x2="${x(name)}" y2="${H - 8}" class="life"/>`).join('')
  const arrows = steps.map((s, i) => {
    const y = top + gap * i + 22; const a = x(s.from); const z = x(s.to); const dir = z > a ? 1 : -1
    const left = Math.min(a, z)
    const inner = `
      ${s.point ? `<circle cx="${left + 20}" cy="${y - 14}" r="10" class="pt"/><text x="${left + 20}" y="${y - 10}" text-anchor="middle" class="pt-t">${s.point}</text>` : ''}
      <text x="${left + 38}" y="${y - 9}" class="msg">${esc(s.label)}</text>
      <line x1="${a}" y1="${y}" x2="${z - dir * 7}" y2="${y}" class="arrow${s.dashed ? ' dashed' : ''}"/>
      <path d="M${z} ${y} l${-dir * 9} -5 v10 z" class="tip${s.dashed ? ' dashed' : ''}"/>`
    return s.point ? `<a href="#" data-step="${s.point}" class="hop">${inner}</a>` : `<g>${inner}</g>`
  }).join('')
  return `<svg class="flow" viewBox="0 0 ${W} ${H}" role="img" aria-label="The calls of one request">${head}${arrows}</svg>`
}

const KINDS = {
  'domain error': 'error',
  'domain event': 'event',
  aggregate: 'aggregate',
  command: 'command',
  'value object': 'vo',
  'plain array': 'array',
  'API port': 'api',
  'SPI port': 'spi',
  adapter: 'adapter',
}
// A kind that isn't in KINDS, such as "interface" or "type", is drawn in grey. In a TypeScript file, a kind in FITS has to fit the
// declaration of the type. A kind outside FITS, and a type in a file of another language, isn't checked.
const FITS = {
  error: ['domain error'],
  class: ['domain event', 'aggregate', 'value object', 'adapter'],
  interface: ['API port', 'SPI port', 'command', 'interface'],
  type: ['plain array', 'command', 'type'],
}
const declaredAs = (text, file) => !/\.tsx?$/.test(file) ? undefined
  : / extends DomainError\b/.test(text) ? 'error'
  : /^export (?:abstract )?class /.test(text) ? 'class'
  : /^export interface /.test(text) ? 'interface'
  : /^export type /.test(text) ? 'type' : undefined
const isPort = kind => kind === 'API port' || kind === 'SPI port'

function typesSvg (b) {
  const nodes = []; const edges = []
  for (const l of b.body.map(l => l.trim()).filter(Boolean)) {
    const edge = /^(.+?)\s+->\s+(.+?)(?:\s+@(\d+))?$/.exec(l)
    if (edge) { edges.push({ from: edge[1], to: edge[2], point: edge[3] }); continue }
    const node = /^(.+?)\s+=\s+(.+?)\s+in\s+(.+)$/.exec(l)
    if (!node) throw new Error(`this line of a types block isn't "<name> = <kind> in <context>" or "<name> -> <name> @<point>":\n  ${l}`)
    const names = node[1].split('|').map(s => s.trim()); const kinds = node[2].split('|').map(s => s.trim())
    if (names.length !== kinds.length) throw new Error(`each name of a union needs its own kind:\n  ${l}`)
    names.forEach((name, i) => {
      const found = declarations.find(d => d.name === name && laneName(contextOf(d.file)) === node[3])
      const as = found && declaredAs(found.text, found.file)
      if (!as || !Object.values(FITS).flat().includes(kinds[i])) return
      if (!FITS[as].includes(kinds[i])) throw new Error(`${name} in ${node[3]} is declared as ${as === 'error' ? 'a domain error' : `${as === 'interface' ? 'an' : 'a'} ${as}`} in ${found.file}:${found.line}, but the types block gives it the kind "${kinds[i]}"`)
    })
    nodes.push({ id: `${node[1]} in ${node[3]}`, name: node[1], parts: names.map((name, i) => ({ name, kind: kinds[i] })), ctx: node[3] })
  }
  const other = nodes.some(n => n.parts.some(p => p.kind === 'plain array')) ? 'other' : 'array'
  const cls = kind => KINDS[kind] ?? other
  const byId = new Map(nodes.map(n => [n.id, n]))
  const resolve = end => {
    const scoped = /^(.+?)\s+in\s+(.+)$/.exec(end)
    if (scoped) {
      if (!byId.has(`${scoped[1]} in ${scoped[2]}`)) throw new Error(`a types block uses "${end}" in an arrow, but there isn't any box "${scoped[1]}" declared in ${scoped[2]}`)
      return `${scoped[1]} in ${scoped[2]}`
    }
    const found = nodes.filter(n => n.name === end)
    if (!found.length) throw new Error(`a types block uses "${end}" in an arrow without declaring it`)
    if (found.length > 1) throw new Error(`a types block uses "${end}" in an arrow, but ${found.length} boxes share that name, in ${found.map(n => n.ctx).join(' and in ')}. Write "${end} in <context>" in the arrow.`)
    return found[0].id
  }
  for (const e of edges) { e.from = resolve(e.from); e.to = resolve(e.to) }
  const ctxs = [...new Set(nodes.map(n => n.ctx))]
  const W = 1040; const col = W / ctxs.length; const cx = n => col * ctxs.indexOf(n.ctx) + col / 2
  const PART = 34; const ROW_GAP = 40; const top = 68
  let row = -1; let prev
  for (const n of nodes) {
    const linked = prev && prev.ctx !== n.ctx && edges.some(e => e.from === prev.id && e.to === n.id)
    if (!linked) row++
    n.row = row; prev = n
    n.w = Math.min(col - 24, Math.max(170, ...n.parts.map(p => p.name.length * 8.6 + 36)))
    n.h = n.parts.length === 1 ? 42 : PART * n.parts.length
  }
  const rowH = []; for (const n of nodes) rowH[n.row] = Math.max(rowH[n.row] ?? 0, n.h)
  const rowY = []; rowH.reduce((y, h, i) => { rowY[i] = y; return y + h + ROW_GAP }, top)
  for (const n of nodes) { n.x = cx(n) - n.w / 2; n.y = rowY[n.row] + (rowH[n.row] - n.h) / 2 }
  const bottom = rowY.at(-1) + rowH.at(-1)
  const H = bottom + 76
  const head = ctxs.map((name, i) => `
    <rect x="${col * i + col / 2 - 100}" y="8" width="200" height="36" rx="18" class="who"/>
    <text x="${col * i + col / 2}" y="31" text-anchor="middle" class="who-t">${esc(name)}</text>
    ${i ? `<line x1="${col * i}" y1="8" x2="${col * i}" y2="${bottom + 12}" class="life"/>` : ''}`).join('')
  const boxes = nodes.map(n => n.parts.map((p, i) => {
    const h = n.parts.length === 1 ? n.h : PART; const y = n.y + h * i
    return `<rect x="${n.x}" y="${y}" width="${n.w}" height="${h}" rx="${isPort(p.kind) ? h / 2 : 5}" class="k k-${cls(p.kind)}"/>
      <text x="${n.x + n.w / 2}" y="${y + h / 2 + 5}" text-anchor="middle" class="k-t k-${cls(p.kind)}">${esc(p.name)}</text>`
  }).join('')).join('')
  const arrows = edges.map(e => {
    const a = byId.get(e.from); const z = byId.get(e.to)
    const side = a.row === z.row; const dir = cx(z) >= cx(a) ? 1 : -1
    // An arrow back to an earlier box is drawn beside the other arrows so that the reader can see every arrow and every badge.
    const back = side ? nodes.indexOf(z) < nodes.indexOf(a) : z.row < a.row
    const BACK = 12
    let [x1, y1] = side ? [cx(a) + dir * a.w / 2, a.y + a.h / 2] : [cx(a), a.y + a.h]
    let [x2, y2] = side ? [cx(z) - dir * z.w / 2, z.y + z.h / 2] : [cx(z), z.y]
    let path = side || x1 === x2 ? `M${x1} ${y1} L${x2} ${y2}` : `M${x1} ${y1} V${(y1 + y2) / 2} H${x2} V${y2}`
    let [bx, by] = side ? [(x1 + x2) / 2, y1 - 18] : [x2 + 20, (y1 + y2) / 2 + (x1 === x2 ? 0 : 12)]
    if (back && side) {
      y1 += BACK; y2 += BACK
      path = `M${x1} ${y1} L${x2} ${y2}`; [bx, by] = [(x1 + x2) / 2, y1 + 18]
    } else if (back && a.ctx === z.ctx) {
      const between = nodes.filter(n => n.ctx === a.ctx && n.row >= z.row && n.row <= a.row)
      const xo = Math.min(...between.map(n => n.x)) - BACK * 2
      path = `M${a.x} ${a.y + a.h / 2} H${xo} V${z.y + z.h / 2} H${z.x}`; [bx, by] = [xo - 18, (a.y + a.h / 2 + z.y + z.h / 2) / 2]
    } else if (back) {
      x1 -= BACK; x2 -= BACK
      path = `M${x1} ${y1} V${(y1 + y2) / 2} H${x2} V${y2}`; [bx, by] = [x2 - 20, (y1 + y2) / 2 + 12]
    }
    const inner = `<path d="${path}" class="t-arrow" marker-end="url(#types-tip)"/>
      ${e.point ? `<circle cx="${bx}" cy="${by}" r="10" class="pt"/><text x="${bx}" y="${by + 4}" text-anchor="middle" class="pt-t">${e.point}</text>` : ''}`
    return e.point ? `<a href="#" data-step="${e.point}" class="hop">${inner}</a>` : `<g>${inner}</g>`
  }).join('')
  const used = [...new Set(nodes.flatMap(n => n.parts.map(p => p.kind)))]
  const others = used.filter(k => !KINDS[k])
  const keys = [...used.filter(k => KINDS[k]), ...(others.length ? [others.join(', ')] : [])]
  const legend = keys.map((k, i) => {
    const x = 16 + i * 128; const y = bottom + 40
    return `<rect x="${x}" y="${y}" width="${isPort(k) ? 30 : 18}" height="18" rx="${isPort(k) ? 9 : 3}" class="k k-${cls(k)}"/>
      <text x="${x + (isPort(k) ? 38 : 26)}" y="${y + 14}" class="key-t">${esc(k)}</text>`
  }).join('')
  return `<svg class="flow types" viewBox="0 0 ${W} ${H}" role="img" aria-label="The types that each step returns">
    <defs><marker id="types-tip" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1L9 5L1 9z" class="t-tip"/></marker></defs>
    ${head}${arrows}${boxes}${legend}</svg>`
}

// A list is part of the explanation rather than a separate piece of evidence, so it's drawn as body text without a box.
const textList = b => `<${b.ordered ? 'ol' : 'ul'} class="text-list">${b.items.map(item => `<li>${inline(item)}</li>`).join('')}</${b.ordered ? 'ol' : 'ul'}>`

// A path or a name in a table cell can wrap after a / or a _.
const breakable = html => html.replace(/(<[^>]+>)|([/_])/g, (m, tag, ch) => tag ?? `${ch}<wbr>`)

function evidence (b) {
  return b.type === 'code' ? codeBlock(b)
    : b.type === 'flow' ? flowSvg(b)
    : b.type === 'types' ? typesSvg(b)
    : b.type === 'quote' ? `<blockquote>${inline(b.text)}</blockquote>`
    : b.type === 'list' ? textList(b)
    : `<table><thead><tr>${b.head.map(c => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${b.rows.map(r => `<tr>${r.map(c => `<td>${breakable(inline(c))}</td>`).join('')}</tr>`).join('')}</tbody></table>`
}

const META = []
const plain = text => inline(text).replace(/<a [^>]*>|<\/a>/g, '')
const bare = text => text.replace(/[`*]/g, '')
const ALERTS = tabs.flatMap(t => t.points.flatMap(p => (p.title ? [...p.intro, ...p.parts] : p.blocks).filter(b => b.type === 'attention').map(block => ({ tab: t, point: p, block }))))
const shortOf = p => p.short
const attnHtml = b => `<div class="attn" id="${b.id}"><span class="icon" aria-hidden="true">⚠️</span><div><h4 class="attn-t">${inline(b.heading)}</h4><p>${inline(b.text)}</p></div></div>`

// ── the diagrams of a point ──────────────────────────────────────────────
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`
// A diagram or a list shows a context without the word "context", because the lane and the colour already tell the reader
// that the name is a context.
const laneName = c => c.name.replace(/ context$/, '')
const cx = c => c ? `c${c.n}` : 'cx'
const contextsOf = x => x.ctxs.map(c => esc(laneName(c))).join(' → ')

// A diagram that is wider than its space is drawn at its full size. The reader zooms and pans the diagram with these controls.
const zoomable = (html, label) => `<div class="zp">
          <div class="zp-tools" hidden><span class="zp-hint">Drag to pan</span><button type="button" data-zp="out" aria-label="Zoom out" title="Zoom out">−</button><button type="button" class="zp-pc" data-zp="reset" aria-label="Show the ${label} at its full size" title="Full size">100%</button><button type="button" data-zp="in" aria-label="Zoom in" title="Zoom in">+</button><button type="button" data-zp="fit" title="Show the whole ${label}">Fit</button></div>
          <div class="zp-view"><div class="zp-in">${html}</div></div>
        </div>`

// The card diagram has one card per passage, in the lane of the context of the passage. The page draws the arrows between
// the cards in the order of the passages.
const CARD = { big: { lane: 120, min: 200, gap: 30, pad: 0 }, strip: { lane: 104, min: 180, gap: 24, pad: 12 } }
function cardsHtml (p, kind) {
  const size = CARD[kind]
  const lanes = [...new Set(p.passages.map(x => x.lane))]
  const laneWidth = Math.max(size.lane, ...lanes.map(c => c ? Math.ceil(laneName(c).length * 7) + 14 : 0))
  const natural = laneWidth + p.passages.length * (size.min + size.gap) + size.pad
  const rows = lanes.map((c, i) => `<div class="fl-bg ${cx(c)}" style="grid-row:${i + 1}"></div><div class="fl-lane ${cx(c)}" style="grid-row:${i + 1}">${c ? esc(laneName(c)) : ''}</div>`).join('')
  const cards = p.passages.map((x, i) => `<button type="button" class="fl-box ctxb-${cx(x.lane)}" data-i="${i}" data-to="${x.n}" style="grid-row:${lanes.indexOf(x.lane) + 1};grid-column:${i + 2}"><span class="fl-n">${x.n}</span><span class="fl-t">${esc(x.short ?? x.label ?? bare(x.title))}</span></button>`).join('')
  return zoomable(`<div class="fl ${kind}"><div class="fl-grid" style="grid-template-columns:${laneWidth}px repeat(${p.passages.length}, minmax(${size.min}px, 1fr));min-width:${natural}px">${rows}${cards}</div><svg class="fl-svg"></svg></div>`, 'card diagram')
}

// The sequence diagram of a point is drawn from the lines of the tab's flow block that are tagged with the number of the
// point. Each arrow shows the number of its passage. A click on the number opens that passage.
const HUE = ['#0e7c74', '#a15c07', '#6d28d9', '#0369a1', '#be123c', '#475569', '#4d7c0f', '#c2410c', '#0e7490', '#a21caf']
function seqSvg (p) {
  const who = p.who.map(w => ({ ...w, label: w.ctx ? w.ctx.name : w.name, hue: w.ctx ? HUE[w.ctx.n] : '#334155' }))
  const at = name => who.findIndex(w => w.name === name)
  const boxWidth = w => Math.max(180, Math.ceil(w.label.length * 7.8) + 28)
  const TEXT = 6.7
  const between = Math.max(0, ...p.calls.filter(s => Math.abs(at(s.from) - at(s.to)) === 1).map(s => s.label.length * TEXT + 48))
  const pitch = Math.max(1040 / who.length, Math.min(380, Math.max(240, between, ...who.map(w => boxWidth(w) + 24))))
  const x = i => Math.round(pitch * i + pitch / 2)
  const loops = p.calls.filter(s => s.from === s.to).map(s => x(at(s.from)) + 56 + s.label.length * TEXT)
  const W = Math.ceil(Math.max(pitch * who.length, ...loops))
  const top = 58; const gap = 28; const H = top + gap * (p.calls.length - 1) + 26
  const head = who.map((w, i) => `<g class="sq-who" data-w="${i}"><rect x="${x(i) - boxWidth(w) / 2}" y="6" width="${boxWidth(w)}" height="28" rx="6" fill="#fff" stroke="${w.hue}" stroke-width="1.5"/><text x="${x(i)}" y="25" text-anchor="middle" font-size="13" font-weight="700" fill="${w.hue}">${esc(w.label)}</text><line x1="${x(i)}" y1="34" x2="${x(i)}" y2="${H - 2}" stroke="#cbd5e1" stroke-dasharray="4 4"/></g>`).join('')
  const arrows = p.calls.map((s, i) => {
    const y = top + gap * i; const a = at(s.from); const z = at(s.to)
    const dash = s.dashed ? ' stroke-dasharray="6 4"' : ''
    const badge = (cx, dy) => s.passage ? `<g class="sq-n" data-to="${s.passage}"><rect x="${cx - 14}" y="${y + dy - 13}" width="28" height="17" rx="8.5"/><text x="${cx}" y="${y + dy}" text-anchor="middle">${p.n}.${s.passage}</text></g>` : ''
    if (a === z) {
      return `<g class="sq" data-a="${a}" data-z="${z}"><path d="M${x(a) + 2} ${y - 7}h40v14h-38" fill="none" stroke-width="1.6"${dash}/><polygon class="ah" points="${x(a) + 3},${y + 7} ${x(a) + 12},${y + 2} ${x(a) + 12},${y + 11}"/><text x="${x(a) + 52}" y="${y + 4}" font-size="12.5" text-anchor="start">${esc(s.label)}</text>${badge(x(a) - 24, 4)}</g>`
    }
    const dir = z > a ? 1 : -1
    return `<g class="sq" data-a="${a}" data-z="${z}"><line x1="${x(a) + dir * 2}" y1="${y}" x2="${x(z) - dir * 9}" y2="${y}" stroke-width="1.6"${dash}/><polygon class="ah" points="${x(z) - dir},${y} ${x(z) - dir * 10},${y - 5} ${x(z) - dir * 10},${y + 4}"/><text x="${(x(a) + x(z)) / 2}" y="${y - 6}" font-size="12.5" text-anchor="middle">${esc(s.label)}</text>${badge(x(a) + dir * 22, 0)}</g>`
  }).join('')
  return zoomable(`<svg class="seq-svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="The calls of this point in order">${head}${arrows}</svg>`, 'sequence diagram')
}

// The 2 views of "The request" are the card diagram and the sequence diagram. The overview slide of a point has the large
// version. The header above the passages has the small version, which the reader folds and unfolds.
function diagramsHtml (p, kind) {
  if (!p.passages.length) return ''
  const seq = p.calls.length > 0
  const fold = kind === 'strip'
  return `<div class="dsw${fold ? ' fold closed' : ''}${seq ? '' : ' one'}" data-v="flow">
        <div class="dsw-h">${fold ? `<button type="button" class="dsw-fold" aria-label="Show the diagram" title="Show the diagram">${ICON.left}</button>` : ''}<span class="dsw-t">${p.request ? 'The request' : 'The passages'}</span>${seq ? `
          <div class="dtabs" role="tablist"><button type="button" class="dtab" role="tab" data-v="flow">Flow</button><button type="button" class="dtab" role="tab" data-v="seq">Sequence</button></div>` : ''}</div>
        <div class="dsw-b">
          <div class="dv" data-v="flow">${cardsHtml(p, kind)}</div>${seq ? `
          <div class="dv" data-v="seq">${seqSvg(p)}</div>` : ''}
        </div>
      </div>`
}

// ── a point ──────────────────────────────────────────────────────────────
const textBlock = b => b.type === 'list' ? textList(b) : `<p class="ex-line">${inline(b.text)}</p>`

function slideHtml (x, p, next) {
  META.push({ id: x.id, point: p.title, label: `${x.n}. ${bare(x.title)}` })
  const isText = b => b.type === 'text' || b.type === 'list'
  const shown = x.blocks.filter(b => !isText(b))
  // The text column has the paragraphs and the notes of each code block, in the order of the source.
  const text = x.blocks.map(b => isText(b) ? textBlock(b) : b.type === 'code' && b.file ? notesPanel(b) : '').join('')
  const before = p.passages[x.n - 2]; const after = p.passages[x.n]
  return `
        <article class="row slide step${shown.length ? '' : ' solo'}" id="${x.id}" data-s="${x.n}"${x.who >= 0 ? ` data-w="${x.who}"` : ''}>
          <h3 class="slide-h"><span class="slide-n">${p.n}.${x.n}</span><span>${inline(x.title)}</span></h3>
          <div class="r-text">
            ${shown.length ? `<button type="button" class="tcol" aria-label="Hide the text" title="Hide the text">${ICON.left}<span class="tcol-l">Show text</span></button>` : ''}
            ${text}
            ${x.warnings.map(attnHtml).join('')}
          </div>
          ${shown.length ? `<div class="r-code">${shown.map(evidence).join('')}</div>` : ''}
          <div class="sfoot">
            ${before ? `<button type="button" class="sgo" data-to="${before.n}" title="${esc(bare(before.title))}">‹ ${p.n}.${before.n}</button>` : '<span></span>'}
            ${after ? `<button type="button" class="sgo next" data-to="${after.n}" title="${esc(bare(after.title))}">Next: ${p.n}.${after.n} ›</button>`
              : `<span class="sdone">End of “${esc(shortOf(p))}”${next ? `<button type="button" class="sgo next" data-go="${next.id}">Next point: ${esc(shortOf(next))} →</button>` : ''}</span>`}
          </div>
        </article>`
}

function sidebarHtml (p) {
  return `
        <nav class="sb" aria-label="Passages of the point">
          <div class="sb-head"><button type="button" class="sb-col" aria-label="Hide the passages" title="Hide the passages">${ICON.left}</button><span class="sb-name">${esc(shortOf(p))}</span></div>
          <p class="sb-heading">Passages</p>
          <ul class="sb-list">
            <li class="sb-li ov-li" data-li="0"><a class="sb-item" data-to="0" title="Overview"><span class="sb-n ov">◎</span><span class="sb-b"><span class="sb-t">Overview</span></span></a></li>${p.passages.map(x => `
            <li class="sb-li" data-li="${x.n}"><a class="sb-item" data-to="${x.n}" title="${esc(bare(x.title))}"><span class="sb-n ${cx(x.lane)}">${x.n}</span><span class="sb-b"><span class="sb-t">${esc(bare(x.title))}${x.warnings.length ? ' ⚠️' : ''}</span>${x.ctxs.length ? `<span class="sb-c ctx-t ${cx(x.lane)}">${contextsOf(x)}</span>` : ''}<span class="sb-say" data-say="${x.id}"></span></span></a>${x.files.length ? `
              <ul class="sb-sub">${x.files.map(b => `<li><a class="sb-file" data-file="${b.g}" title="${esc(b.file)}">${ICON.file}<span class="sb-fn">${esc(b.file.split('/').pop())}</span>${b.notes.length ? `<span class="sb-cnt">${b.notes.length}</span>` : ''}</a></li>`).join('')}</ul>` : ''}</li>`).join('')}
          </ul>
        </nav>`
}

function overviewSlideHtml (p) {
  const contexts = new Set(p.passages.flatMap(x => x.ctxs)).size
  const stat = (icon, text) => `<span>${icon}${text}</span>`
  const stats = `<span class="ov-stats">${contexts ? stat(ICON.contexts, plural(contexts, 'context')) : ''}${stat(ICON.passages, plural(p.passages.length, 'passage'))}</span>`
  const inPassages = p.passages.flatMap(x => x.warnings.map(w => ({ w, x })))
  return `
        <div class="overview-slide" data-s="0">
          <h3 class="ov-h">${esc(shortOf(p))} at a glance${stats}</h3>
          ${p.intro.map(b => b.type === 'text' ? `<p class="lead">${inline(b.text)}</p>` : b.type === 'list' && !isToc(b) ? textList(b) : '').join('')}
          ${p.warnings.map(attnHtml).join('')}
          ${inPassages.length ? `<ul class="ov-warn">${inPassages.map(({ w, x }) => `<li><a href="#${w.id}" data-go="${w.id}"><span aria-hidden="true">⚠️</span> ${plain(w.heading)}</a> <span class="dim">passage ${x.n}</span></li>`).join('')}</ul>` : ''}
          ${diagramsHtml(p, 'big')}
          <div class="ide">
            <div class="ide-h ide-cols"><span>#</span><span>Passage</span><span>Context</span><span>Files</span><span>Notes</span></div>${p.passages.map(x => `
            <div class="ide-r ide-cols" data-to="${x.n}"><span class="ide-n">${x.n}</span><span class="ide-t">${esc(bare(x.title))}${x.warnings.length ? ' ⚠️' : ''}</span><span class="ide-c">${x.ctxs.length ? `<span class="cdot ${cx(x.lane)}" aria-hidden="true"></span><span>${contextsOf(x)}</span>` : ''}</span><span class="ide-num">${new Set(x.files.map(b => b.file)).size}</span><span class="ide-num">${x.noteCount}</span></div>`).join('')}
          </div>
          ${p.passages.length ? '<button type="button" class="ov-go" data-to="1">Start with passage 1 →</button>' : ''}
        </div>`
}

// The panel that drops down from the timeline shows the passages of a point before the reader opens the point.
const dropdownHtml = p => `<template data-dd="${p.id}"><div class="ddp-in">
        <div><div class="ddp-h">${p.n}. ${esc(shortOf(p))}</div><div class="ddp-s">${plain(p.title)}</div><div class="ddp-acts"><button type="button" class="ddp-go" data-go="${p.id}">Open the overview</button><button type="button" class="ddp-x">Close (Esc)</button></div></div>
        <ol>${p.passages.map(x => `<li data-go="${x.id}"><span class="n">${x.n}</span><span><span class="t">${esc(bare(x.title))}</span>${x.ctxs.length ? `<span class="c ${cx(x.lane)}">${contextsOf(x)}</span>` : ''}<span class="x">${plain(x.blurb)}</span></span></li>`).join('')}</ol>
      </div></template>`

function pointHtml (p, n, t, ti) {
  if (!p.title) {
    const story = t.points.filter(q => q.title).map((q, i) => `
        <li><a href="#${q.id}" data-go="${q.id}">
          <span class="num">${i + 1}</span>
          <span class="card-body"><b>${plain(q.title)}${q.attention ? ' <span class="icon">⚠️</span>' : ''}</b>
          <span>${plain(q.intro.find(b => b.type === 'text')?.text ?? '')}</span></span>
        </a></li>`).join('')
    const flow = p.blocks.find(b => b.type === 'flow')
    const types = p.blocks.find(b => b.type === 'types')
    const alerts = ti === 0 ? ALERTS : ALERTS.filter(a => a.tab === t)
    return `
    <section class="point overview plain" id="${p.id}">
      <div class="lead">${p.blocks.map(b => b.type === 'text' ? `<p>${inline(b.text)}</p>` : b.type === 'list' ? textList(b) : b.type === 'table' ? `<div class="show">${evidence(b)}</div>` : '').join('')}</div>
      ${alerts.length ? `<div class="alerts"><h3>⚠️ ${alerts.length} ${alerts.length === 1 ? 'thing needs' : 'things need'} your attention</h3>${alerts.map(a => `<details class="alert"><summary>${inline(a.block.heading)}</summary><p>${inline(a.block.text)}</p><p class="alert-at"><a href="#${a.block.id}" data-go="${a.block.id}">Go to the warning</a> <span class="dim">${esc(a.tab.title)} · ${plain(a.point.title)}</span></p></details>`).join('')}</div>` : ''}
      ${flow ? flowSvg(flow) : ''}
      ${types ? typesSvg(types) : ''}
      <ol class="story">${story}</ol>
    </section>`
  }
  const next = t.points[t.points.indexOf(p) + 1]
  return `
    <section class="point slides${p.attention ? ' has-attn' : ''}" id="${p.id}" data-n="${n}">
      <div class="shell">${sidebarHtml(p)}
        <div class="stage">
          <div class="phead">
            <span class="num big">${n}</span>
            <div><h2>${inline(p.title)}</h2></div>
            <label class="read"><input type="checkbox" data-id="${p.id}"> read</label>
          </div>
          <div class="snav"><button type="button" class="sstep" data-d="-1" aria-label="Previous passage">‹</button><span class="scount"></span><button type="button" class="sstep" data-d="1" aria-label="Next passage">›</button><span class="skeys">← → keys</span></div>
          <div class="slide-top">${diagramsHtml(p, 'strip')}</div>${overviewSlideHtml(p)}${p.passages.map(x => slideHtml(x, p, next)).join('')}
        </div>
      </div>
      ${dropdownHtml(p)}
    </section>`
}

function filesTab () {
  const groups = new Map()
  for (const [file, entry] of changed) {
    const parts = file.split('/')
    const group = parts.length > 3 ? parts.slice(0, 3).join('/') : parts.length > 1 ? parts.slice(0, -1).join('/') : '(root)'
    if (!groups.has(group)) groups.set(group, [])
    groups.get(group).push([file, entry])
  }
  const titleOf = new Map(tabs.flatMap(t => t.points.map(p => [p.id, p.title])))
  const row = ([file, e], group) => `<tr class="${e.shownIn.size ? '' : 'unseen'}">
        <td><a class="sym" href="${esc(e.status === 'D' ? blob(file, 0, meta.base) : blob(file))}"><code>${esc(file.startsWith(group + '/') ? file.slice(group.length + 1) : file)}</code></a></td>
        <td><span class="chip ${(STATUS[e.status] ?? STATUS.M)[1]}">${(STATUS[e.status] ?? STATUS.M)[0]}</span></td>
        <td class="num-cell">+${e.added} −${e.removed}</td>
        <td>${[...e.shownIn].map(id => `<a href="#${id}" data-go="${id}">${inline(titleOf.get(id) || id).replace(/<a [^>]*>|<\/a>/g, '')}</a>`).join('<br>') || '<span class="dim">not shown</span>'}</td>
      </tr>`
  const shown = [...changed.values()].filter(e => e.shownIn.size).length
  return `
    <section class="point files-pt plain" id="files">
      <p class="lead">${shown} of the ${changed.size} changed files are shown in a code block of this walkthrough. A file that isn't shown has a grey row.</p>
      ${[...groups].map(([group, rows]) => `<details class="grp"><summary><code>${esc(group)}</code> <span class="count">${rows.length} files · ${rows.filter(([, e]) => e.shownIn.size).length} shown</span></summary>
      <table class="files"><tbody>${rows.map(r => row(r, group)).join('')}</tbody></table></details>`).join('')}
    </section>`
}

const tabHtml = (t, ti) => {
  let n = 0; let dots = 0
  const body = t.points.map(p => pointHtml(p, p.title ? ++n : 0, t, ti)).join('')
  return `
  <div class="pane" data-tab="${ti}" ${ti ? 'hidden' : ''}>
    <main>
      <ol class="line" aria-label="The points of this tab">
        ${t.points.map((p, i) => `<li><a href="#${p.id}" data-toc="${p.id}"${p.title ? "" : ` class="ov"`} title="${esc(p.title.replace(/[\`*]/g, '') || 'Overview')}"><span class="dot">${p.title ? ++dots : '◎'}</span><span class="lab">${p.title ? esc(shortOf(p)) : 'Overview'}${p.attention ? ' ⚠️' : ''}</span><span class="badge" data-badge="${p.id}"></span></a></li>`).join('')}
      </ol>
      ${body}
    </main>
  </div>`
}

const RUN = randomUUID()
const here = name => readFileSync(new URL(name, import.meta.url), 'utf8')
const panes = tabs.map(tabHtml).join('')

writeFileSync(outPath, `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>!${esc(meta.iid)} · nick-walkthrough</title>
<style>${here('../nick-review/report.css')}
${here('./walkthrough.css')}</style>
</head>
<body>
<div class="tabbar">
  <div class="hdr bar">
    <a class="mr" href="${esc(meta.url)}" title="${esc(meta.title)}"><b>!${esc(meta.iid)}</b> ${esc(meta.title)}</a>
    <nav class="tabs">
      ${tabs.map((t, i) => `<button class="tab" aria-selected="${i === 0}" data-tab="${i}">${esc(t.title)}${ALERTS.some(a => a.tab === t) ? ` <span class="warn">⚠️ ${ALERTS.filter(a => a.tab === t).length}</span>` : ''}</button>`).join('')}
      <button class="tab" aria-selected="false" data-tab="${tabs.length}">Every file <span class="count">${changed.size}</span></button>
      <button class="tab" aria-selected="false" data-tab="${tabs.length + 1}">Comments <span class="count" id="nComments">0</span></button>
    </nav>
  </div>
</div>

<div class="wrap">
  ${panes}
  <div class="pane" data-tab="${tabs.length}" hidden><main>${filesTab()}</main></div>
  <div class="pane" data-tab="${tabs.length + 1}" hidden><main><section class="point comments-pt plain" id="comments"><p class="lead">These are the comments that you've written on this page. Select any text on the page and click Comment to add one.</p><ol class="cm-list" id="cmList"></ol></section></main></div>
</div>

<footer>
  <div class="fwrap">
    <div class="tally"><b id="nRead">0</b> of <span id="nPoints"></span> read · <b id="nSaid">0</b> comments saved on this page</div>
    <span class="spacer"></span>
    <div class="keys"><span><kbd>←</kbd><kbd>→</kbd> previous and next passage</span><span><kbd>j</kbd><kbd>k</kbd> next and previous point</span><span><kbd>r</kbd> read</span></div>
    <button class="primary" id="brief">Collect all my feedback</button>
  </div>
</footer>

<dialog id="out">
  <div class="dlg">
    <h3>Your feedback</h3>
    <p>This collects every comment that you wrote on the page. To add one, close this, select some text on the page and click <b>Comment</b>. Type anything else here:</p>
    <textarea id="general" class="say" rows="4" placeholder="General feedback on the walkthrough"></textarea>
    <p class="paste">Copy the block below and paste it into a Claude session. It contains the path of the walkthrough.</p>
    <textarea id="outText" readonly></textarea>
    <div class="acts"><button class="act" id="doCopy">Copy</button><button class="act" id="shut">Close</button></div>
  </div>
</dialog>

<script>
const IID = ${JSON.stringify(meta.iid)}
const RUN = ${JSON.stringify(RUN)}
const MR = ${JSON.stringify(meta.url)}
const SOURCE = ${JSON.stringify(resolve(srcPath))}
const PAGE = ${JSON.stringify(resolve(outPath))}
const REPO_DIR = ${JSON.stringify(process.cwd())}
const RENDERER = ${JSON.stringify(new URL(import.meta.url).pathname)}
const META = ${JSON.stringify(META).replace(/</g, '\\u003c')}
${here('./walkthrough.js')}
</script>
</body>
</html>
`)
console.log(`wrote ${outPath}: ${tabs.length} tabs, ${META.length} passages, ${changed.size} changed files`)
for (const notice of notices) console.log(notice)
if (process.argv.includes('--check')) {
  // The page measures itself when its address ends with "?check". This runs after the page is written, because a block
  // that runs past the edge can come from the CSS as well as from the source.
  const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  const dom = execFileSync(CHROME, ['--headless=new', '--window-size=1440,900', '--virtual-time-budget=5000', '--dump-dom', `file://${resolve(outPath)}?check`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
  const found = /<pre id="layout-check">(.*?)<\/pre>/s.exec(dom)?.[1]
  if (found === undefined) console.log('the layout check did not run: the page did not report a result')
  else {
    const tooWide = JSON.parse(found.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&'))
    console.log(tooWide.length ? `${plural(tooWide.length, 'block')} past the right edge of a column:\n${tooWide.map(t => `  ${t}`).join('\n')}` : 'no block runs past the right edge of a column')
  }
}
