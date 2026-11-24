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
  return { prefix, name, pkg, n: i % 6 }
})
if (!CONTEXTS.length) throw new Error('the front matter has no "context:" line. Write one per context: "context: <path prefix> = <name> = <package name>"')
const contextOf = file => CONTEXTS.filter(c => file.startsWith(c.prefix)).sort((a, b) => b.prefix.length - a.prefix.length)[0]
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

const CONTEXT_NAMES = new RegExp(CONTEXTS.map(c => esc(c.name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).sort((a, b) => b.length - a.length).join('|'), 'g')
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

const MAX_SENTENCES = 4
const flush = () => {
  if (!para.length) return
  const text = para.join(' ')
  const sentences = (text.replace(/`[^`]*`/g, 'x').match(/[.?!](?=\s|$)|:$/g) || []).length
  if (sentences > MAX_SENTENCES) errors.push(`under "${point?.title || tab.title}": this paragraph has ${sentences} sentences. The limit is ${MAX_SENTENCES} sentences:\n    ${text.slice(0, 90)}…`)
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
  errors.push(`under "${point.title}": this ${KIND[block.type]} isn't under a "### " title. Start each passage with a "### <title>" line${point.parts.length ? ', including after a "> ⚠️" block' : '. Before the first "### " title, a point only has its intro paragraphs, its steps block or table of contents and "> ⚠️" blocks'}:\n    ${String(text).slice(0, 90)}`)
}

function addSteps (body) {
  if (!point?.title) { errors.push(`a steps block is only allowed under a "## " heading:\n    ${body[0]}`); return }
  if (point.parts.length) { errors.push(`under "${point.title}": the steps block belongs before the first "### " title:\n    ${body[0]}`); return }
  // The chain is built from the passages of the point. So a steps block is always empty.
  const lines = body.filter(l => l.trim())
  if (lines.length) { errors.push(`under "${point.title}": a steps block is always empty, because the renderer builds the chain from the "### " passages of the point. Remove the lines of the block. If a line was better than the title of its passage, put that wording into the title:\n    ${lines[0]}`); return }
  point.steps = true
}

const lines = src.slice(front[0].length).split('\n')
for (let i = 0; i < lines.length; i++) {
  const line = lines[i]
  if (line.startsWith('# ')) { flush(); tab = { title: line.slice(2).trim(), points: [] }; tabs.push(tab); point = undefined; passage = undefined; continue }
  if (!tab) { if (line.trim()) throw new Error(`line before the first "# " heading: ${line}`); continue }
  if (line.startsWith('## ')) { flush(); const named = /^(.*?)\s*\{([^}]+)\}$/.exec(line.slice(3).trim()); point = { title: named ? named[1] : line.slice(3).trim(), short: named?.[2], intro: [], parts: [] }; passage = undefined; tab.points.push(point); continue }
  if (line.startsWith('### ')) {
    flush()
    if (!point?.title) { errors.push(`a "### " title is only allowed under a "## " heading:\n    ${line}`); continue }
    passage = { title: line.slice(4).trim(), blocks: [] }; point.parts.push(passage); continue
  }
  if (line.startsWith('```')) {
    flush()
    const [lang = '', file, ref] = line.slice(3).trim().split(/\s+/)
    const body = []
    for (i++; i < lines.length && !lines[i].startsWith('```'); i++) body.push(lines[i])
    if (lang === 'steps') { addSteps(body); continue }
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
  if (!contextOf(block.file)) errors.push(`${where}: ${block.file} isn't under any "context:" line of the front matter`)
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
const isToc = b => b.type === 'list' && b.items.some(item => /^\[[^\]]+\]\(#/.test(item))
tabs.forEach((t, ti) => t.points.forEach((p, pi) => {
  p.id = `t${ti + 1}p${pi + (t.points[0].title ? 1 : 0)}`
  let n = 0; let w = 0
  const code = (b, where) => {
    b.rows = locate(b, where)
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
  // The steps block and the table of contents list every passage of the point in order, so that item n links to passage n.
  const breakdown = (kind, ids) => {
    const want = p.passages.map(x => x.id)
    if (ids.join(' ') !== want.join(' ')) errors.push(`under "${p.title}": the ${kind} links to ${ids.join(', ') || 'nothing'}, but it has to link to each "### " passage of the point in order, one item per passage: ${want.join(', ') || '(the point has no passages)'}`)
  }
  // One step per passage, with the title of the passage and the context of its first code block that has a path.
  if (p.steps) p.steps = p.passages.map(x => ({ id: x.id, text: x.title, ctx: contextOf(x.blocks.find(b => b.type === 'code' && b.file)?.file ?? '') }))
  for (const b of p.intro.filter(isToc)) {
    breakdown('table of contents', b.items.map(item => /^\[[^\]]+\]\(#([^)]+)\)/.exec(item)?.[1] ?? '(an item without a link at its start)'))
  }
}))
if (errors.length) throw new Error(`${errors.length} problems in the source:\n\n${errors.join('\n\n')}`)

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
  const lines = note => {
    const [first, last] = [b.rows[note.first].n, b.rows[note.last].n]
    return first === last ? `line ${first}` : `lines ${first} to ${last}`
  }
  const list = `<ol class="nn">${b.notes.map(note => `<li data-k="${note.k}"><span class="nb">${note.k}</span><span class="nn-t"><span class="nn-at">${lines(note)}</span>${inline(note.text)}</span></li>`).join('')}</ol>`
  const cards = b.notes.map(note => `<span class="tc pc" role="note" data-k="${note.k}" data-first="${note.first}" data-last="${note.last}"><span class="tc-msg"><span class="tc-av" aria-hidden="true">A</span><span class="tc-body"><span class="tc-meta"><span class="tc-au">Agent</span><span class="tc-at">${lines(note)}</span></span><span class="tc-text">${inline(note.text)}</span></span></span></span>`).join('')
  const name = b.file ? b.file.split('/').pop() : ''
  const dir = b.file ? b.file.slice(0, -name.length) : ''
  const head = b.file ? `
        <div class="file">
          ${own ? `<span class="ctx c${own.n}">${esc(own.name)}</span>` : ''}
          <a class="fpath" href="${esc(blob(b.file, b.first, ref))}" title="${esc(b.file)}"><span class="dir">${esc(dir)}</span><b>${esc(name)}</b></a>
          <span class="chip ${cls}">${label}</span>
          <button class="copy" type="button">Copy</button>
        </div>` : ''
  const fold = b.rows.length > FOLD
  const code = `<div class="code${fold ? ' folded' : ''}">${head}<pre>${rows}</pre>${fold ? `<button class="unfold" type="button">Show all ${b.rows.length} lines</button>` : ''}${cards}</div>`
  return b.notes.length ? `<div class="noted">${list}${code}</div>` : code
}

function flowSvg (b) {
  const steps = b.body.filter(l => l.trim()).map(l => {
    const m = /^(.+?)\s*(-->|->)\s*(.+?):\s*(.+?)(?:\s+@(\d+))?$/.exec(l.trim())
    if (!m) throw new Error(`this line of a flow block isn't "<from> -> <to>: <label> @<point>":\n  ${l}`)
    return { from: m[1], dashed: m[2] === '-->', to: m[3], label: m[4], point: m[5] }
  })
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
    for (const k of kinds) if (!KINDS[k]) throw new Error(`"${k}" isn't a kind of a types block. The kinds are: ${Object.keys(KINDS).join(', ')}\n  ${l}`)
    nodes.push({ id: `${node[1]} in ${node[3]}`, name: node[1], parts: names.map((name, i) => ({ name, kind: kinds[i] })), ctx: node[3] })
  }
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
    return `<rect x="${n.x}" y="${y}" width="${n.w}" height="${h}" rx="${isPort(p.kind) ? h / 2 : 5}" class="k k-${KINDS[p.kind]}"/>
      <text x="${n.x + n.w / 2}" y="${y + h / 2 + 5}" text-anchor="middle" class="k-t k-${KINDS[p.kind]}">${esc(p.name)}</text>`
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
  const legend = used.map((k, i) => {
    const x = 16 + i * 128; const y = bottom + 40
    return `<rect x="${x}" y="${y}" width="${isPort(k) ? 30 : 18}" height="18" rx="${isPort(k) ? 9 : 3}" class="k k-${KINDS[k]}"/>
      <text x="${x + (isPort(k) ? 38 : 26)}" y="${y + 14}" class="key-t">${esc(k)}</text>`
  }).join('')
  return `<svg class="flow types" viewBox="0 0 ${W} ${H}" role="img" aria-label="The types that each step returns">
    <defs><marker id="types-tip" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1L9 5L1 9z" class="t-tip"/></marker></defs>
    ${head}${arrows}${boxes}${legend}</svg>`
}

// A list is part of the explanation rather than a separate piece of evidence, so it's drawn as body text without a box.
const textList = b => `<${b.ordered ? 'ol' : 'ul'} class="text-list">${b.items.map(item => `<li>${inline(item)}</li>`).join('')}</${b.ordered ? 'ol' : 'ul'}>`

function evidence (b) {
  return b.type === 'code' ? codeBlock(b)
    : b.type === 'flow' ? flowSvg(b)
    : b.type === 'types' ? typesSvg(b)
    : b.type === 'quote' ? `<blockquote>${inline(b.text)}</blockquote>`
    : b.type === 'list' ? textList(b)
    : `<table><thead><tr>${b.head.map(c => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${b.rows.map(r => `<tr>${r.map(c => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`
}

const META = []
const plain = text => inline(text).replace(/<a [^>]*>|<\/a>/g, '')
const ALERTS = tabs.flatMap(t => t.points.flatMap(p => (p.title ? [...p.intro, ...p.parts] : p.blocks).filter(b => b.type === 'attention').map(block => ({ tab: t, point: p, block }))))
const shortOf = p => p.short ?? p.title.replace(/[`*]/g, '').split(' ').slice(0, 4).join(' ') + '…'
const attnHtml = b => `<div class="attn" id="${b.id}"><span class="icon" aria-hidden="true">⚠️</span><div><h4 class="attn-t">${inline(b.heading)}</h4><p>${inline(b.text)}</p></div></div>`
function passageHtml (p, point) {
  if (p.type === 'attention') return attnHtml(p)
  META.push({ id: p.id, point: point.title, label: `${p.n}. ${p.title.replace(/[`*]/g, '')}` })
  const lead = p.blocks.findIndex(b => b.type !== 'text' && b.type !== 'list')
  const [tell, show] = lead === -1 ? [p.blocks, []] : [p.blocks.slice(0, lead), p.blocks.slice(lead)]
  const para = b => `<p class="ex-line">${inline(b.text)}</p>`
  return `
      <div class="step${show.length ? '' : ' solo'}" id="${p.id}">
        <div class="tell">
          <h3 class="pt-line"><span class="num">${p.n}</span><span>${inline(p.title)}</span></h3>
          ${tell.map(b => b.type === 'list' ? textList(b) : para(b)).join('')}
        </div>
        ${show.length ? `<div class="show">${show.map(b => b.type === 'text' ? para(b) : b.type === 'list' ? textList(b) : evidence(b)).join('')}</div>` : ''}
      </div>`
}

const numberOf = (p, id) => p.passages.find(x => x.id === id)?.n ?? '?'
const stepsHtml = p => `<ol class="steps">${p.steps.map(s => `
        <li><a href="#${esc(s.id)}"><span class="num">${numberOf(p, s.id)}</span>${s.ctx ? `<span class="ctx c${s.ctx.n}">${esc(s.ctx.name)}</span>` : ''}<span class="steps-t">${plain(s.text)}</span></a></li>`).join('')}
      </ol>`

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
    <section class="point overview" id="${p.id}">
      <div class="lead">${p.blocks.map(b => b.type === 'text' ? `<p>${inline(b.text)}</p>` : b.type === 'list' ? textList(b) : b.type === 'table' ? `<div class="show">${evidence(b)}</div>` : '').join('')}</div>
      ${alerts.length ? `<div class="alerts"><h3>⚠️ ${alerts.length} ${alerts.length === 1 ? 'thing needs' : 'things need'} your attention</h3>${alerts.map(a => `<details class="alert"><summary>${inline(a.block.heading)}</summary><p>${inline(a.block.text)}</p><p class="alert-at"><a href="#${a.block.id}" data-go="${a.block.id}">Go to the warning</a> <span class="dim">${esc(a.tab.title)} · ${plain(a.point.title)}</span></p></details>`).join('')}</div>` : ''}
      ${flow ? flowSvg(flow) : ''}
      ${types ? typesSvg(types) : ''}
      <ol class="story">${story}</ol>
    </section>`
  }
  const lead = p.intro.filter(b => b.type === 'text')
  const tocHtml = b => `<ol class="steps toc">${b.items.map(item => `
        <li><span class="toc-i"><span class="num">${numberOf(p, /^\[[^\]]+\]\(#([^)]+)\)/.exec(item)?.[1])}</span><span class="steps-t">${inline(item)}</span></span></li>`).join('')}
      </ol>`
  const introHtml = b => b.type === 'attention' ? attnHtml(b) : isToc(b) ? tocHtml(b) : b.type === 'list' ? textList(b) : ''
  return `
    <section class="point${p.attention ? ' has-attn' : ''}" id="${p.id}" data-n="${n}">
      <div class="phead">
        <span class="num big">${n}</span>
        <div><h2>${inline(p.title)}</h2>${lead.map(b => `<p class="lead">${inline(b.text)}</p>`).join('')}</div>
        <label class="read"><input type="checkbox" data-id="${p.id}"> read</label>
      </div>
      ${p.steps ? stepsHtml(p) : ''}
      ${p.intro.map(introHtml).join('')}
      ${p.parts.map(x => passageHtml(x, p)).join('')}
      <div class="pager"><button class="act prev" type="button">← Previous</button><span class="spacer"></span><button class="primary next" type="button">Next →</button></div>
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
    <section class="point files-pt" id="files">
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
        ${t.points.map((p, i) => `<li><a href="#${p.id}" data-toc="${p.id}" title="${esc(p.title.replace(/[\`*]/g, '') || 'Overview')}"><span class="dot">${p.title ? ++dots : '◎'}</span><span class="lab">${p.title ? esc(shortOf(p)) : 'Overview'}${p.attention ? ' ⚠️' : ''}</span><span class="badge" data-badge="${p.id}"></span></a></li>`).join('')}
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
  <div class="pane" data-tab="${tabs.length + 1}" hidden><main><section class="point comments-pt" id="comments"><p class="lead">These are the comments that you've written on this page. Select any text on the page and click Comment to add one.</p><ol class="cm-list" id="cmList"></ol></section></main></div>
</div>

<footer>
  <div class="fwrap">
    <div class="tally"><b id="nRead">0</b> of <span id="nPoints"></span> read · <b id="nSaid">0</b> comments saved on this page</div>
    <span class="spacer"></span>
    <div class="keys"><span><kbd>j</kbd><kbd>k</kbd> next and previous point</span><span><kbd>r</kbd> read</span></div>
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
